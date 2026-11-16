---
name: Hub Academia Design System
version: 3.1.0
modes:
  - dark
  - light
surfaces:
  landing: obsidian-cinema-webgl-fixed-dark
  workspace: precision-dark-glass-and-light-slate
colors:
  background: "#050507"
  backgroundSecondary: "#0D0D10"
  backgroundTertiary: "#141418"
  surface: "#0E0E12"
  surfaceGlass: "rgba(14, 14, 18, 0.78)"
  surfaceHover: "rgba(255, 255, 255, 0.06)"
  foreground: "#F8FAFC"
  foregroundSecondary: "#D1D5DB"
  foregroundMuted: "#94A3B8"
  primary: "#2563EB"
  primaryHover: "#1D4ED8"
  primaryLight: "#60A5FA"
  accentTelemetry: "#38BDF8"
  accentMedical: "#0F766E"
  accentMedicalBright: "#2DD4BF"
  borderSubtle: "rgba(255, 255, 255, 0.09)"
  borderStrong: "rgba(96, 165, 250, 0.34)"
  lightBackground: "#EDF2F7"
  lightSurface: "#FFFFFF"
  lightTertiary: "#E2E8F0"
  lightForeground: "#0F172A"
  lightForegroundSecondary: "#334155"
  lightForegroundMuted: "#64748B"
  success: "#10B981"
  warning: "#F59E0B"
  danger: "#EF4444"
typography:
  display:
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
    fontSize: "clamp(2.5rem, 6vw, 4.75rem)"
    lineHeight: "0.98"
    fontWeight: "700"
    letterSpacing: "-0.045em"
  h1:
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
    fontSize: "clamp(2rem, 4.2vw, 3.35rem)"
    lineHeight: "1.05"
    fontWeight: "600"
    letterSpacing: "-0.038em"
  h2:
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
    fontSize: "clamp(1.5rem, 2.5vw, 2.25rem)"
    lineHeight: "1.14"
    fontWeight: "600"
    letterSpacing: "-0.03em"
  h3:
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
    fontSize: "1.1875rem"
    lineHeight: "1.3"
    fontWeight: "600"
    letterSpacing: "-0.02em"
  body:
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
    fontSize: "1rem"
    lineHeight: "1.6"
    fontWeight: "400"
    letterSpacing: "-0.01em"
  bodySmall:
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
    fontSize: "0.875rem"
    lineHeight: "1.5"
    fontWeight: "400"
    letterSpacing: "0em"
  monoTelemetry:
    fontFamily: "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace"
    fontSize: "0.75rem"
    lineHeight: "1.3"
    fontWeight: "500"
    letterSpacing: "0.1em"
rounded:
  xs: "2px"
  sm: "4px"
  md: "8px"
  lg: "14px"
  xl: "20px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
  2xl: "64px"
  sectionDesktop: "112px"
  sectionMobile: "72px"
---

# Hub Academia — Design Contract (`DESIGN.md`)

## 1. Visual Thesis & Dual-Surface Architecture

**Hub Academia** es una plataforma peruana dedicada a la **Inteligencia Artificial aplicada, divulgación científica y entrenamiento académico-profesional** (Educación, Salud y Boletín IA, según `documentation/BRIEF_MASTER.md`). Su interfaz se organiza en dos superficies armónicas con estricto respeto al contraste:

1. **Superficie A — Escenario Cinematográfico Fijo en Dark Cinema (`/` Landing):**
   * Fijada permanentemente en modo oscuro (`data-theme-locked="dark"`) sin modificar las preferencias guardadas para los workspaces.
   * Fondo **Negro Obsidiana / Grafito Neutro (`#050507` / `#0D0D10`)** con **prohibición estricta de rellenos o superficies azules en Dark Mode** (`BRIEF_MASTER.md`).
   * **Hero Óptico de IA Aplicada (sin vídeo simple de la H):** imagen editorial fotorrealista de alta dirección de arte (`v6/hero-ai-desktop` y `v6/hero-ai-mobile`) integrada en **1 único `<canvas>` WebGL** mediante proyección 2.5D por paralaje de profundidad + giroscopio orbital 3D interactivo de coordenadas (Educación `#2563EB`, IA Aplicada `#38BDF8`, Medicina `#2DD4BF`) + campo sutil de luz y cámara vinculada al scroll.
   * Narrativa por 6 capítulos (`01 / Propósito IA`, `02 / Ecosistema`, `03 / Educación Inicial`, `04 / Boletín IA`, `05 / Hoja de Ruta`, `06 / Pases de Acceso`) con riel de progreso en escritorio, drawer índice limpio y control visible de movimiento reducido.

2. **Superficie B — Consola de Estudio de Precisión (`/simulator-dashboard`, `/repaso`, `/library`, `/pricing`):**
   * Conserva paridad completa **Dark-Glass Neutro (`#050505` / `#0E0E12` / vidrio ahumado neutro) ↔ Light Slate Studio (`#EDF2F7` / `#FFFFFF`)**.
   * Paneles estructurados con bordes hairline `css-border-gradient` (`1px`) reservados exclusivamente al elemento activo o recomendado por vista.
   * **Regla clínica/pedagógica inviolable:** las preguntas de simulador oficial (MINEDU/MINSA, cero sintéticas), flashcards SM-2 y fichas de biblioteca mantienen fondo limpio sin blurs pesados, partículas ni imágenes decorativas detrás del texto de estudio.

---

## 2. Color & Theme Grammar

* **Superficies Dark Cinema & Dark-Glass (neutras sin tinte azul):**
  * Base: `#050507`, secundaria `#0D0D10`, elevada `#141418`, vidrio ahumado `#0E0E12` (`rgba(14, 14, 18, 0.78)` + `backdrop-filter: blur(14px)`).
* **Acentos funcionales únicamente (CTAs, hairline highlights, estado activo, señales):**
  * **IA & Educación:** `#2563EB` (`--primary`), hover `#1D4ED8`, contorno sutil `#60A5FA`, telemetría `#38BDF8`.
  * **Medicina (`[data-study-context="medicina"]`):** `#0F766E`, señal brillante `#2DD4BF`.
* **Light Slate Studio (`[data-theme="light"]` en workspaces):** `#EDF2F7` / `#FFFFFF` / `#0F172A` con bordes oscuros translúcidos `rgba(15, 23, 42, 0.10)` (nunca reutilizar alphas de modo oscuro).

---

## 3. Typography & Micro-Telemetry

* **Familia principal:** `Inter` (`400`, `500`, `600`, `700`) con `font-variant-numeric: tabular-nums` en métricas, cronómetros, conteos (`10 / 20 / 60`, `10 / 20 / 100`) y tarifas (`S/ 0`, `S/ 9.90`, `S/ 24.90`).
* **Display Hero (`clamp(2.5rem, 6vw, 4.75rem)`):** `line-height: 0.98`, tracking `-0.045em`, `text-wrap: balance`. Máximo contraste sobre zona izquierda oscura limpia (escritorio) o franja superior limpia (móvil).
* **Eyebrows y Telemetría (`monoTelemetry`):** `0.75rem`, tracking `0.10em`, etiquetas sobrias separadas por `/` (ej. `01 / INTELIGENCIA ARTIFICIAL APLICADA`). Máximo 2 etiquetas breves por tarjeta.

---

## 4. Materiality, Borders & Visual Finishes

| Técnica | Uso autorizado | Límites obligatorios |
| --- | --- | --- |
| **CSS Border Gradient (`1px`)** | Plan Cuatrimestral destacado, tab o modo activo, visor HUD de capítulo, card de configuración activa en simulador | Máximo **1 jerarquía por vista**. Stops neutros + acento puntual (`<= 0.34` alpha). |
| **CSS Alpha Masking** | Desvanecimiento lateral/vertical de bordes en marcos multimedia y tiras horizontales | Incluir siempre `-webkit-mask-image` + `mask-image`. |
| **Progressive Blur** | Franja superior discreta (`84px–104px`, `pointer-events: none`) bajo la barra superior en páginas scrollables (`/` y `/library`) | Nunca en `/quiz` ni `/flashcards`; `z-index` inferior a cabecera, modales y Hubi. |
| **Corner Precision Ticks** | Escuadras finas de `6px–8px` en CTA principal de Hero o marco HUD de escenario WebGL | Contraste sutil (`<= 0.35`); prohibido en inputs y formularios de estudio. |

---

## 5. Layout, Responsive & HUD Discipline

* **Contenedor máximo:** `1440px` (`24px` padding escritorio / `16px` móvil). Se conserva el contrato compartido (`header.css`, `chat.js` `#chatbot-*`, `#user-session-controls`).
* **Landing Desktop (`>= 961px`):** **1 único `<canvas>` WebGL** como escenario base + dock inferior de capítulos (`01`–`06`) + control visible de `Reducir movimiento`, dejando libre el cuadrante inferior derecho para el lanzador de **Hubi (`#chatbot-toggle`)**.
* **Landing Móvil (`<= 768px`, probado a `390×844`):** Riel inferior colapsado en píldora compacta de capítulo actual, CTA dentro de zona de pulgar, variante vertical `9:16` del arte Hero con cielo superior oscuro y todos los botones `>= 44×44px`. Sin `user-scalable=no`.

---

## 6. Motion, Camera & Choreography Rules

1. **Un solo reloj (`GSAP 3.15.0` + `ScrollTrigger`):** Conduce la cámara WebGL (`rig.target → rig.smooth`), el desplazamiento 2.5D de capas y el scrub de videos de capítulos inferiores. Cero secuestro de `wheel`.
2. **Solo propiedades GPU en DOM:** Animar únicamente `transform`, `opacity` y `clip-path`. Prohibido `filter: blur()` continuo sobre titulares al transicionar capítulos.
3. **Presupuesto WebGL:** Topado en `DPR <= 1.25` (móvil) / `1.75` (escritorio), pausa automática en `document.hidden` o al salir de vista.
4. **Workspaces (Zero-Queue):** Transiciones de paneles de `180ms–220ms ease-out`, `:active { transform: scale(0.97); }`, respuesta `0ms` en atajos de teclado.
5. **Reduced Motion:** Desactiva cámara orbital continua, bloquea rotación automática y conserva el arte editorial estático en 100% visibilidad.
