# 🎨 Design System & Branding: Hub Academia v3.5

**Estado:** Fuente de Verdad (Single Source of Truth)  
**Versión:** 3.5  
**Enfoque Estético:** Dual-Theme Engine (Dark Mode Matte Black 🌙 / Light Mode Studio Slate ☀️) / Cyber-Minimalist / Manta Pill Gradients

Este documento define las reglas visuales, componentes interactivos, tokens CSS y directrices de experiencia de usuario (UX) para **Hub Academia**. Sirve como guía de referencia obligatoria para mantener la coherencia en todas las interfaces de la plataforma.

---

## 📌 Tabla de Contenidos
1. [🌈 Paleta de Colores y Tokens Dinámicos (Dark 🌙 / Light ☀️)](#1--paleta-de-colores-y-tokens-dinámicos-dark---light-)
2. [🔤 Tipografía y Jerarquía](#2--tipografía-y-jerarquía)
3. [🔲 Componentes Core](#3--componentes-core)
4. [📐 Grids, Layouts y Responsividad](#4--grids-layouts-y-responsividad)
5. [✨ Micro-interacciones y Efectos](#5--micro-interacciones-y-efectos)
6. [🚀 Reglas UX Mandatorias](#6--reglas-ux-mandatorias)
7. [🎨 Iconografía (Font Awesome 6.4.0)](#7--iconografía-font-awesome-640)

---

## 1. 🌈 Paleta de Colores y Tokens Dinámicos (Dark 🌙 / Light ☀️)

La plataforma cuenta con un motor de temas centralizado gobernado por el atributo `data-theme="dark"` y `data-theme="light"` en la etiqueta raíz `<html>`. Queda estrictamente prohibido el uso de valores hexadecimales hardcodeados en hojas de componentes; todo elemento debe consumir tokens CSS de `theme.css`.

### Matriz de Tokens de Tema

| Token CSS | Dark Mode (`[data-theme="dark"]`) | Light Mode (`[data-theme="light"]`) | Propósito / Uso en UI |
| :--- | :--- | :--- | :--- |
| `--bg-main` | `#050505` (Deep Black) | `#f8fafc` (Clean Slate 50) | Fondo principal de la aplicación (`body`). |
| `--bg-secondary` / `--card-bg` | `#0a0a0a` (Matte Black) | `#ffffff` (Pure White) | Tarjetas, paneles, contenedores de sección y modales. |
| `--bg-tertiary` | `#121212` (Elevated Black) | `#f1f5f9` (Slate 100) | Subtarjetas anidadas, inputs, barras de progreso de fondo. |
| `--surface-hover` | `rgba(255, 255, 255, 0.05)` | `rgba(0, 0, 0, 0.04)` | Estados hover en ítems de lista, dropdowns y botones secundarios. |
| `--border-color` | `rgba(255, 255, 255, 0.08)` | `rgba(0, 0, 0, 0.09)` | Bordes sutiles y separadores divisorios. |
| `--border-hover` | `rgba(255, 255, 255, 0.18)` | `rgba(0, 0, 0, 0.18)` | Bordes al posar el cursor o enfocar elementos. |
| `--text-main` | `#ffffff` / `#f8fafc` | `#0f172a` (Slate 900) | Títulos principales, encabezados H1-H3 y texto de alto contraste. |
| `--text-secondary` | `#cbd5e1` (Slate 300) | `#334155` (Slate 700) | Texto de párrafos, opciones de cuestionario y descripciones. |
| `--text-muted` | `#94a3b8` (Slate 400) | `#64748b` (Slate 500) | Subtítulos secundarios, etiquetas de fecha y metadatos. |
| `--modal-bg` | `#0a0a0a` | `#ffffff` | Superficie sólida opaca para modales interactivos. |
| `--modal-overlay-bg` | `rgba(0, 0, 0, 0.75)` | `rgba(15, 23, 42, 0.5)` | Fondo difuminado (`backdrop-filter`) tras los modales. |
| `--input-bg` | `#121212` | `#ffffff` | Relleno de campos de texto, áreas de texto y selects. |
| `--input-border` | `rgba(255, 255, 255, 0.12)` | `rgba(0, 0, 0, 0.15)` | Borde perimetral de controles de formulario. |
| `--input-text` | `#ffffff` | `#0f172a` | Color de tipografía digitada por el usuario. |
| `--shadow-md` | `0 4px 20px rgba(0, 0, 0, 0.5)` | `0 4px 20px rgba(0, 0, 0, 0.06)` | Elevación media en tarjetas y badges. |
| `--shadow-xl` | `0 25px 50px -12px rgba(0, 0, 0, 0.85)` | `0 20px 40px -12px rgba(0, 0, 0, 0.12)` | Elevación alta en ventanas modales y drawers. |

### Acentos de Marca (Idénticos en ambos temas para consistencia)
* **Azul Primario (`--primary`):** `#3b82f6` (Hover: `#2563eb`).
* **Degradado Manta Orange (`--gradient-orange`):** `linear-gradient(135deg, #f97316 0%, #ea580c 100%)`.
* **Degradado Cyan-Blue (`--gradient-primary`):** `linear-gradient(90deg, #4f46e5 0%, #3b82f6 50%, #06b6d4 100%)`.
* **Éxito (`--success`):** `#10b981`.
* **Peligro (`--danger`):** `#ef4444`.
* **Advertencia (`--warning`):** `#f59e0b`.

---

## 2. 🔤 Tipografía y Jerarquía

Utilizamos exclusivamente la tipografía **Inter** para asegurar alta legibilidad y una apariencia moderna y tecnológica.

* **Fuente Principal:** `'Inter', system-ui, -apple-system, sans-serif`
* **Escala de Encabezados (PC):**
  * **H1 (Título de Página):** `2.2rem` | ExtraBold (800) | `letter-spacing: -0.02em`
  * **H2 (Secciones):** `1.6rem` | Bold (700) | `letter-spacing: -0.01em`
  * **H3 (Subsecciones/Tarjetas):** `1.25rem` | SemiBold (600)
* **Escala de Encabezados (Móvil - Breakpoint <= 768px):**
  * **H1:** `1.8rem` | ExtraBold (800)
  * **H2:** `1.4rem` | Bold (700)
  * **H3:** `1.15rem` | SemiBold (600)
* **Texto de Cuerpo (Body Text):**
  * **Normal:** `0.95rem` | Regular (400) | `line-height: 1.6`
  * **Pequeño/Muted:** `0.85rem` | Regular (400) | `line-height: 1.5`

---

## 3. 🔲 Componentes Core

### 3.1. Modales (Estándar Negro Mate con Backdrop Blur)
Todas las ventanas modales de la plataforma deben seguir este patrón visual exacto:
* **Overlay tras el Modal (`.modal-overlay`):** Capa difuminada semi-transparente `rgba(0, 0, 0, 0.75)` con `backdrop-filter: blur(12px) saturate(160%)` que permite percibir suavemente la página de fondo.
* **Cuerpo del Modal (`.modal-content`):** `#0a0a0a` (Negro Mate Puro Sólido OPACO, sin transparencias internas para que el contenido sea 100% nítido).
* **Borde:** `1px solid rgba(255, 255, 255, 0.08)`.
* **Esquinas:** `20px` (Rounded).
* **Sombra:** `0 25px 50px -12px rgba(0, 0, 0, 0.9)`.

### 3.2. Botones y Estados Hover

> [!IMPORTANT]
> El estilo **Manta Pill Gradient con Insignia Circular de Icono** o **Manta Orange Degradado** son los estándares estéticos obligatorios para botones primarios de acción. Los botones secundarios deben mantener una estética limpia y sobria, integrándose perfectamente con el explorador.

* **Botón Primario de Repaso / Core Action (`.btn-premium-primary`):**
  * **Fondo:** `linear-gradient(135deg, #f97316 0%, #ea580c 100%)`.
  * **Texto:** `#ffffff` en negrita (600/700).
  * **Sombra / Glow:** `box-shadow: 0 4px 15px rgba(249, 115, 22, 0.35)`.
  * **Hover:** `transform: translateY(-2px); box-shadow: 0 6px 20px rgba(249, 115, 22, 0.5); color: #ffffff;`.

* **Botón Secundario (`.btn-secondary` / `.btn-premium-secondary`):**
  * **Fondo Inicial:** `rgba(255, 255, 255, 0.04)` (Translúcido limpio).
  * **Borde:** `1px solid rgba(255, 255, 255, 0.08)`.
  * **Forma:** `border-radius: 10px - 12px` | Texto `#e2e8f0`.
  * **Interacción Hover (Estándar Explorador):** `background: rgba(255, 255, 255, 0.08); border-color: rgba(255, 255, 255, 0.2); color: #ffffff; transform: translateY(-1px);`.
  * **Regla de Coherencia:** Queda estrictamente prohibido usar fondos plomos opacos (ej. `#334155` o `rgba(51,65,85,0.8)`) o aplicar halos/bordes de resplandor naranja aislados sobre botones secundarios que rompan la armonía visual.

### 3.3. Badges de Estado e Insignias de Plan
* **Pill Badge Plan Active (`.badge-premium`):**
  * Fondo `linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)`, texto `#ffffff` en negrita, radio `50px`, con resplandor sutil `box-shadow: 0 0 14px rgba(59, 130, 246, 0.4)`.
* **Pill Badge Verificado / Activo (`.badge-status-active`):**
  * Fondo `rgba(16, 185, 129, 0.12)`, borde `1px solid rgba(16, 185, 129, 0.3)`, texto `#34d399` en negrita (600), radio `50px`.

### 3.4. Inputs y Form Controles
* **Fondo:** `#121212` (Dark Slate Matte).
* **Borde:** `1px solid rgba(255, 255, 255, 0.08)`.
* **Focus State:** Borde cambia a `#3b82f6` con un shadow azul difuminado (`box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15)`).
* **Borde de Esquinas:** `12px`.

### 3.5. Modales de Zona de Peligro / Advertencia Crítica (`.modal-content.danger-variant`)
* **Propósito:** Confirmación de acciones irreversibles (Eliminación de cuenta, purga de historial).
* **Borde Destacado:** `1px solid rgba(239, 68, 68, 0.3)`.
* **Caja de Aviso Interna:** Fondo `rgba(239, 68, 68, 0.08)`, borde `1px solid rgba(239, 68, 68, 0.2)`, texto `#fca5a5`.
* **Botón de Confirmación Peligrosa (`.btn-danger-pill`):**
  * Fondo `linear-gradient(135deg, #ef4444 0%, #dc2626 100%)`.
  * Radio `50px` (Pill), texto `#ffffff` en negrita (700).
  * Glow Effect: `box-shadow: 0 4px 15px rgba(239, 68, 68, 0.35)`.
  * Hover: `transform: translateY(-2px) scale(1.02); box-shadow: 0 6px 25px rgba(239, 68, 68, 0.5)`.

### 3.6. Tarjetas de Consumo de IA & Servicios (`.usage-main-card`)
* **Título Responsivo:** `Consumo de Servicios IA` (`font-size: 1.1rem` en escritorio, disminuyendo progresivamente a `0.95rem` en pantallas móviles `<= 480px` para evitar desbordamientos).
* **Contenedor Flex de Cabecera:** `min-width: 0` para prevenir quiebres de línea forzados.
* **Ítems de Consumo (`.usage-item`):** Fondo `var(--bg-tertiary)`, borde `var(--border-color)`, ajuste automático de texto con `word-break: break-word` e indicadores de cuotas en tiempo real.

### 3.7. Hero Banner Centrado Dual-Theme (`.hub-hero-container`)
* **Cuadrícula Técnica y Resplandores Ambientales (`.hero-ambient-glow`):** Cuadrícula nítida visible en Dark (`rgba(255, 255, 255, 0.055)`) y Light (`rgba(15, 23, 42, 0.075)`), combinada con iluminación radial multidimensional (azul eléctrico, índigo y violeta en Dark; azul cielo y lavanda suave en Light) que elimina la monotonía del blanco y da profundidad SaaS moderna.
* **Pill Badges Temáticos:** Enlaces superiores estilizados en píldora con microinteracciones para `💊 Salud (SERUMS)` y `🎓 Educación (Ascenso Docente)`.
* **Tipografía Dinámica:** Título H1 `Tu Hub Académico` con gradiente de texto `.hero-gradient-text` optimizado para Dark (`#38bdf8` -> `#818cf8` -> `#ec4899`) y Light (`#2563eb` -> `#6366f1` -> `#db2777`).
* **Botón de Acción Principal (`.hero-primary-cta`):** Píldora degradada interactiva con efecto de elevación y desplazamiento suave hacia los módulos.
* **Cuadrícula Bento de Métricas (`.hero-metrics-grid`):** 4 tarjetas de estadísticas (`1K+`, `5K+`, `98%`, `24/7`) con fondo `var(--card-bg)`, borde `var(--border-color)`, barra superior dinámica en hover y valores tipográficos en `var(--text-main)`.

### 3.8. Header User Profile Pill (`.user-menu-toggle`)
* **Componente de Usuario Enriquecido:** Reemplaza el botón circular simple por una píldora estética con avatar circular, columna con nombre de usuario (`.user-header-name`) y plan de suscripción (`.user-header-tier` ej: `Plan Avanzado`, `Plan Pro`, `Plan Gratuito`), junto con una flecha chevron animada `⌄`.
* **Comportamiento Responsivo:** En dispositivos móviles ultra-compactos `<= 640px` colapsa ordenadamente a avatar + chevron para evitar desbordamientos en la barra de navegación.

### 3.9. Mockup Showcases en Landing Page (`.edu-preview-showcase`, `.med-preview-showcase`)
* **Integración Visual de Imágenes Portada:** Presentación de las capturas oficiales (`educacionportada.png`, `simuladormedicoportada.png`) dentro de marcos glassmorphic de 20px de radio, borde dinámico `var(--border-color)`, sombra de elevación `var(--shadow-lg)` y píldoras flotantes (`.mockup-floating-pill`) con iconos representativos y efecto blur backdrop.
* **Contraste 100% Adaptativo:** Compatible y nítido tanto en Modo Oscuro como en Modo Claro, con microinteracciones de zoom sutil y elevación al posar el cursor.

### 3.10. Módulo de Repaso & Flashcards Dual-Theme (`/repaso` y `/flashcards`)
* **Flashcard Central de Estudio (`.fc-card-face`):** Fondo dinámico `var(--card-bg)`, borde `var(--border-color)`, relieve `var(--shadow-lg)` y tipografía `var(--text-main) !important` en preguntas, respuestas, listas y subtítulos en ambos temas (☀️ / 🌙).
* **Botones FSRS de Calificación (`.control-btn`):** Tarjetas interactivas con `var(--card-bg)`, sombra `var(--shadow-md)`, colores temáticos de feedback (Rojo `Olvidé`, Naranja `Difícil`, Azul `Bien`, Esmeralda `Fácil`) y hover con halo cromático sutil sin sombras negras excesivas.
* **Drawer Tutor IA (`.tutor-chat-panel`):** Panel lateral con `var(--card-bg)`, borde `var(--border-color)`, input con `var(--input-bg)` y `var(--input-text)` y burbujas de respuesta en `var(--bg-tertiary)`.
* **Explorador y Gestión de Mazos (`repaso.html`):** Títulos de mazo en `var(--text-main)`, botones de acción secundarios en `var(--card-bg)` con borde limpio, buscador adaptativo y filas de tarjetas con relieve y contraste completo.
* **Eliminación de Sombras Excesivas:** Sustitución de sombras oscuras duras (36px/40px) por elevaciones refinadas (`var(--shadow-md)`, `var(--shadow-lg)`, `var(--shadow-xl)`).

### 3.11. Simuladores, Dashboard, Quiz & Revisión de Exámenes Dual-Theme (`/simulator-dashboard`, `/quiz`)
* **Modal de Configuración de Simulacro:** Título en `var(--text-main)`, subtítulos en `var(--text-secondary)`, tarjetas de objetivo de examen con `var(--card-bg)` y selección activa con `var(--primary-glow)` y `var(--primary)`. Toggle de modo con `var(--bg-tertiary)` y `var(--border-color)`.
* **Diagnóstico de Rendimiento & Desglose de Materias:** Barras nativas HTML con etiquetas `.html-bar-label` y valores `.html-bar-value` en `var(--text-main)`, tracks en `var(--bg-tertiary)` con borde dinámico.
* **KPI Circular / Dona (`#topicDoughnutChart`, `#doughnut-legend`):** Leyenda dinámica con `var(--text-main)` y `var(--text-secondary)`, con bordes adaptativos según el tema activo. Pestañas de modo (`.kpi-mode-tab`) y tiempo (`.kpi-time-tab`) con clases CSS unificadas y contraste optimizado.
* **Análisis de Patrones de Error (Advanced IA):** Fondos `var(--bg-tertiary)`, bordes punteados `var(--border-color)`, textos de alto contraste (`var(--text-main)` y `var(--text-secondary)`) y botón primario píldora (`#btn-analyze-ai`) con resplandor glow.
* **Barra de Filtro Activo (`#active-config-summary`):** Píldora moderna con `var(--card-bg)` y `var(--border-color)`.
* **Pantalla de Revisión de Examen (`.review-card`):** Tarjetas de preguntas en `var(--card-bg)` con sombra `var(--shadow-sm)`, opciones de respuesta `.review-opt` con `var(--bg-tertiary)`, feedback correcto/incorrecto con bordes claros y explicaciones pedagógicas sobre `var(--surface-hover)`.
* **Desactivación de Banner de Modo Invitado:** Eliminada la inyección persistente del banner de modo invitado para una interfaz de usuario completamente limpia y despejada.

### 3.12. Identidad Cromática por Módulo (Salud Verde Cian vs Educación Azul vs Repaso Naranja)
* **Módulo Salud (SERUMS / Medicina):** Paleta clínica en **Verde Cian / Teal** (`#14b8a6`, `#0d9488`, `#2dd4bf`), presente en píldoras del Hero (`.pill-salud`), secciones de aterrizaje (`#salud-section`), títulos con `.accent-green-text`, botón CTA `.btn-med-theme`, vitrina mockup (`.mockup-floating-pill.pill-med`), bordes y sombras de tarjetas `.med-card-theme`, y variables dinámicas `--primary` (`#0d9488`), `--primary-dark` (`#0f766e`), `--primary-light` (`#2dd4bf`) y resplandores en `simulator-dash.js`.
* **Módulo Educación (Ascenso / Magisterio):** Paleta azul real y eléctrico (`#2563eb`, `#1d4ed8`, `#3b82f6`), presente en píldoras del Hero, secciones de aterrizaje (`#docente-section`), título con `.accent-blue-text`, botón CTA `.btn-edu-theme`, vitrina mockup (`.mockup-floating-pill.pill-edu`), y variables dinámicas `--primary` en el dashboard.
* **Módulo Repaso (Flashcards / FSRS):** Paleta ámbar y naranja (`#f97316`, `#ea580c`), presente en tarjetas de mazos, botones de creación rápida y vistas de comunidad.

### 3.13. Header Global Invariante y Botón "Acceder"
* **Header & Sidebar Invariantes:** El botón `.main-header #open-login-modal` mantiene de forma constante e invariable su estilo azul de marca (`linear-gradient(135deg, #2563eb, #1d4ed8)`) y texto blanco, independientemente del módulo o contexto activo, garantizando coherencia en la barra de navegación.

### 3.14. Perfil de Usuario, Precios y Chat Flotante Dual-Theme
* **Página de Precios (`/pricing`, `#pricing-section`):** Títulos y precios en `var(--text-main)`, botón de Plan Básico en `var(--bg-tertiary)` con borde y Plan Avanzado en Teal `#14b8a6`. Integración obligatoria de FontAwesome para renderizado de iconos del sidebar y header.
* **Perfil de Usuario (`/profile`):** Eliminación de sombras oscuras pesadas (85%-90%) sustituidas por `var(--shadow-sm)` y `var(--shadow-md)`. Textos y tarjetas de consumo de IA sincronizados con `var(--text-main)`, `var(--text-secondary)`, `var(--bg-tertiary)` y `var(--border-color)`.
* **Chatbot Flotante (`chat.css`):** Cabecera `.chatbot-header` adaptativa con `var(--header-bg)` y `var(--border-color)`, eliminando el tono gris plomo fijo en modo claro. Tarjeta de bienvenida con fondo `var(--bg-tertiary)` y borde primario.

### 3.15. Menú Lateral (Sidebar) con Acceso a Planes y Precios
* **Retiro de Selector de Tema:** El interruptor de tema se mantiene exclusivamente en la cabecera superior principal (`.main-header`).
* **Enlace a Planes y Precios:** Se añade la sección `sidebar-section-pricing` con icono `<i class="fas fa-crown"></i>` y enlace a `/pricing`, sincronizada con el enrutador de páginas activas `highlightActiveItem()`.

### 3.16. Modales de Repaso, Biblioteca y Registro Dual-Theme
* **Modales del Módulo Repaso (`repaso.html`):**
  * Modal Previsualización de Mazo (`#preview-deck-modal`): Título en `var(--text-main)`, tarjetas individuales con `var(--bg-tertiary)`, `var(--border-color)`, pregunta en `var(--text-main)` y respuesta en `var(--text-secondary)`.
  * Modal Guía de Estudio (`#deck-guide-modal`): Fondo `#deck-guide-content` con `var(--bg-tertiary)` y texto `var(--text-main)`.
  * Modal Estadísticas del Mazo (`#stats-modal`): Título y contador de Total Tarjetas (`#modal-total`) en `var(--text-main)` (visibles en claro), tarjetas de KPI y contenedor de leyendas SRS adaptativos.
  * Modal de Generación IA (`#ai-modal`) y Carga Masiva: Opciones de audio TTS y fondos en `var(--bg-tertiary)` y `var(--text-main)`.
* **Mi Biblioteca (`library.html`, `components.js`, `browse.css`, `components.css`, `search.css`):**
  * Tarjeta Hero de Novedades (`.news-hero-card`) y Secundarias (`.news-secondary-card`): Fondos dinámicos en `var(--card-bg)` y hovers en `var(--surface-hover)` con bordes de categoría correspondientes, eliminando fondos oscuros `#14101a` / `#18140c` / `#0e1814` / `#0f141f` al interactuar.
  * Píldoras de Filtro (`.manta-filter-pill`): Estado base en `var(--card-bg)` con borde claro, hover en `var(--surface-hover)` con `color: var(--text-main) !important` (evitando texto blanco invisible sobre fondo claro) y estado activo en degradado institucional con texto blanco nítido.
  * Recursos con Portadas Completas (`.unified-resource-card.has-bg-image`, `.browse-card.full-image-card`): Título y metadatos en color blanco `#ffffff !important` con sombra nítida `text-shadow: 0 1px 4px rgba(0,0,0,0.85)` sobre overlay degradado para perfecta legibilidad.
  * Tablón de Notas (`.note-card` y `.library-add-note-btn`): Grilla adaptativa responsive cerrada correctamente (6 columnas PC, 4 laptop, 3 tablet, 2 mobile) con tarjetas contenedoras estilizadas en `var(--card-bg)`, `var(--border-color)`, `var(--shadow-sm)` y acciones flotantes.
* **Modales del Perfil de Usuario (`profile.html`):**
  * Modales de Confirmación de Eliminación (`#delete-modal`) y Edición de Nombre (`#edit-name-modal`): Contenedores con `var(--modal-bg)` y `box-shadow: var(--shadow-xl)`, inputs con `var(--bg-tertiary)` y `var(--text-main)`, botones de cancelación `.btn-secondary` con texto de alto contraste `var(--text-main)` en `var(--bg-tertiary)` y líneas divisorias `var(--border-color)`.
* **Modal de Registro / Invitados (`showAuthPromptModal` en `uiManager.js`):** Título en `var(--text-main)`, caja de logotipo en `var(--bg-tertiary)` y botón Google con degradado institucional azul de alto impacto visual.

---

## 4. 📐 Grids, Layouts y Responsividad

### 4.1. Cuadrícula de Biblioteca (Resources Grid)
* **Escritorio (> 1200px):** Exactamente **6 columnas por fila** (`repeat(6, minmax(0, 1fr))`).
* **Portátiles Medianos (900px a 1200px):** **4 columnas por fila** (`repeat(4, minmax(0, 1fr))`).
* **Tabletas (600px a 900px):** **3 columnas por fila** (`repeat(3, minmax(0, 1fr))`).
* **Celulares (<= 600px):** **2 columnas por fila** (`repeat(2, minmax(0, 1fr))`) con brecha de espacio reducida a `0.75rem`.

---

## 5. ✨ Micro-interacciones y Efectos

* **Brillo de Acento (Glow hover effect):**
  * Las tarjetas interactivas de previsualización deben reaccionar al pasar el cursor cambiando la opacidad del borde y aplicando una sombra del color de acento de la sección.
* **Curva de Transición Estándar:**
  * `transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);`

---

## 6. 🚀 Reglas UX Mandatorias

1. **Superficies Negro Mate Estrictas:** 
   > [!WARNING]
   > Usar siempre `#050505` para el fondo principal de la página (`body`), `#0a0a0a` para tarjetas y contenedores principales, y `#121212` para sub-tarjetas o ítems anidados. Prohibido usar fondos con degradados azulados o capas `::before` de resplandor radial azul en los contenedores principales.
2. **Botones Primarios de Acción:**
   * Utilizar siempre el degradado Manta Cyan-Blue (`linear-gradient(90deg, #4f46e5 0%, #3b82f6 50%, #06b6d4 100%)`) con forma pill (`border-radius: 50px`).

---

## 7. 🎨 Iconografía (Font Awesome 6.4.0)

* **Biblioteca Estándar:** Font Awesome v6.4.0 mediante CDN (`https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css`).

---

## 8. 📱 Mobile Design Systems: HubDocenteApp & HubSaludApp (Light Theme)

Las aplicaciones móviles de React Native / Expo (`HubDocenteApp` y `HubSaludApp`) utilizan un **Tema Claro Profesional de Alto Rendimiento y Contraste**, con esquinas suavemente redondeadas (`roundness: 12px a 20px`), sombras sutiles multiplataforma y tipografía oscura legible (`#0f172a` / `#475569`).

### 8.1. HubDocenteApp (Tema Claro Magisterial)
* **Fondo Principal:** `#f8fafc` (Slate 50).
* **Superficies / Tarjetas:** `#ffffff` (Blanco puro con sombras suaves `rgba(15, 23, 42, 0.06)`).
* **Sub-tarjetas / Fondos de Input:** `#f1f5f9` (Slate 100).
* **Bordes Estándar:** `#e2e8f0` (Slate 200) y `#c7d2fe` (Indigo 200 en estados activos).
* **Color Primario de Marca:** Azul-Morado / Índigo Magisterial (`#4f46e5` a `#4338ca`).
* **Acentos:** Índigo brillante (`#6366f1` / fondo suave `#eef2ff`) y Dorado CNEB (`#f59e0b` / fondo suave `#fffbeb`).
* **Tipografía:** Textos principales en `#0f172a` (Slate 900) y secundarios en `#64748b` (Slate 500).

### 8.2. HubSaludApp (Tema Claro Clínico)
* **Fondo Principal:** `#f8fafc` (Slate 50).
* **Superficies / Tarjetas:** `#ffffff` (Blanco puro con sombras clínicas suaves).
* **Sub-tarjetas / Fondos de Input:** `#f0fdfa` (Teal 50) / `#f1f5f9`.
* **Bordes Estándar:** `#e2e8f0` (Slate 200) y `#99f6e4` (Teal 200 en estados activos).
* **Color Primario de Marca:** Teal Clínico / Verde Médico Profundo (`#0d9488` a `#0f766e`).
* **Acentos:** Esmeralda / Cian Clínico (`#059669` / `#06b6d4` / fondo suave `#ccfbf1`) y Dorado de Excelencia (`#f59e0b` / `#fffbeb`).
* **Tipografía:** Textos principales en `#0f172a` (Slate 900) y secundarios en `#475569` (Slate 600).

### 8.3. Reglas de Componentes Móviles
* **Eliminación de Demo Mode en Apps Móviles:** Redirección inmediata a `/(auth)/login` para usuarios no registrados o `/(tabs)/home` para usuarios autenticados.
* **Badge de Concursos Disponibles:**
  - `HubDocenteApp`: Solo `ASCENSO` habilitado; `NOMBRAMIENTO` y `ACCESO_CARGOS` con badge "Pronto".
  - `HubSaludApp`: Solo `SERUMS` habilitado; `ENAM`, `RESIDENTADO` y `CONCURSO_MINSA` con badge "Pronto".
* **Tutor IA & Markdown:** Tarjetas de sustento con fondo `#f8fafc`, tablas estructuradas con cabecera en tinte suave de marca y tipografía `#0f172a`.
* **Compatibilidad de Sombras:**
  ```typescript
  ...Platform.select({
    web: { boxShadow: '0px 4px 12px rgba(15, 23, 42, 0.06)' },
    default: {
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 3,
    },
  })
  ```

