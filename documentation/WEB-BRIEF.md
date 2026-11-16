# Brief de Diseño Web e Implementación Experiencial — Hub Academia

Actualización: 2026-11-15  
Estado: **Implementado en `presentation/`, `tests/unit/` y `documentation/` (pendiente `npm run build`, `npm test` y QA visual local)**  
Fuente de verdad técnica/negocio: [`BRIEF_MASTER.md`](BRIEF_MASTER.md)

---

## 1. Decisiones Confirmadas y Propuesta Central

1. **Propósito editorial unificado (`BRIEF_MASTER.md`):** Hub Academia es una empresa peruana de **Inteligencia Artificial aplicada**, enfocada en brindar información rigurosa sobre el uso de IA (Boletín IA en `/library`), herramientas inteligentes de productividad docente (Educación Inicial) y entrenamiento auditado con Tutor Reflexivo en Vertex AI (Educación `10/20/60` y Medicina/SERUMS `10/20/100`), cero preguntas sintéticas.
2. **Landing fija en Dark Cinema (`#050507` / grafito neutro):** `/index` queda fija en modo oscuro cinematográfico sin alterar `localStorage.hub_theme` para los workspaces (`/simulator-dashboard`, `/repaso`, `/library`, `/pricing`), donde se mantiene paridad completa **Dark-Glass Neutro ↔ Light Slate Studio**.
3. **Prohibición de superficies azules en Dark Mode (`BRIEF_MASTER.md` §2):** Todos los fondos y paneles oscuros mantienen negro obsidiana y carbón neutro (`#050507`, `#0D0D10`, `#141418`, vidrio neutro `#0E0E12`); los tonos **cobalto (`#2563EB`)**, **hielo (`#38BDF8`)** y **teal médico (`#0F766E` / `#2DD4BF`)** se restringen exclusivamente a CTAs, líneas focales, nodos WebGL y estado activo.
4. **Reemplazo del Hero simple (`H`) por Núcleo Volumétrico WebGL 3D:**
   * Se deshabilita el vídeo heredado de Hero en `js/landing/media-config.js` (`hero.enabled = false`) y se implementa un escenario volumétrico interactivo en **1 único `<canvas id="landing-webgl-stage">`** (`js/landing/world.js` + `js/landing/world-math.js`) que renderiza por ray-tracing analítico una esfera de vidrio obsidiana ahumado con refracción Fresnel, retícula geodésica rotatoria, dos anillos orbitales inclinados con oclusión 3D real, campo de 240 partículas de profundidad y vuelo de cámara entre `S01`–`S06`.
   * Rotación directa al arrastrar sobre el Hero (`touch-action: pan-y`) sin cajas HUD ni revelación de proveedores internos, cambiando el espectro de color dinámicamente al alternar o recorrer `Docentes`, `Salud` y `Flashcards` en `S02` (`hub:product-focus`). Las secciones `S02`–`S06` conservan fondo traslúcido sobre el lienzo WebGL para mantener profundidad continua al hacer scroll.

---

## 2. Diagnóstico de Referencia (`https://eclipse-last-frontier.aura.build/`)

* **Adoptamos:** narrativa por capítulos con cambios de iluminación y profundidad de cámara, tarjetas HUD editoriales de telemetría viva (sin relleno), drawer índice de capítulos en escritorio y botón visible de accesibilidad/movimiento reducido.
* **Rechazamos:** `0` videos reemplazados por secuestro de rueda `wheel` (mantenemos scroll nativo + `GSAP ScrollTrigger`), `blur()` sobre texto en transición, congestión HUD en móvil `390×844` (colapsamos a píldora compacta respetando Hubi `#chatbot-toggle`) y múltiples `<canvas>` o CDNs externos (`iconify-icon`).

---

## 3. Stack de Skills y Responsabilidades (Sin Solapamiento)

* **Sistema de Diseño:** `create-design-md` ([`DESIGN.md`](../DESIGN.md)).
* **Dirección Visual:** `awwwards` + `build-threejs-scroll-worlds` (Landing) · `dark-glass-clean-layout` + `design-taste-frontend` (Workspaces).
* **Motor Único de Scroll & WebGL:** `GSAP 3.15.0 + ScrollTrigger` coordinando nuestro motor WebGL modular puro en ES (`js/landing/world.js`, 0 dependencias CDN/Tailwind) + `scroll-scrubbed-visual-sequence` para `inicial` y `boletin`.
* **Acabados y Micro-interacciones:** `css-border-gradient`, `css-alpha-masking`, `progressive-blur`, `corner-diagonals`, `choreograph`, `emil-design-eng`.
* **Mensaje & Compuerta QA:** `copywriting`, `cro`, `no-ai-design-slop`, `fixing-motion-performance`, `fixing-accessibility`, `web-interface-guidelines`, `/jury`.

---

## 4. Plan Ejecutado y Estado Real

* **Paso A (Dirección Visual y Artefactos):** Exportados derivados WebP V6 (`assets/landing/images/v6/hero-ai-{desktop,mobile}-*.webp`) y textura equirectangular 2:1 continua (`assets/landing/textures/astrolabe-equirect-2048.webp`) desde `hero_ai_desktop_1794791018107.jpg` y `hero_ai_mobile_1794791056216.jpg` mediante `scripts/prepare-hero-v6-assets.js`.
* **Paso B (Fundación Landing `/`):**
  * Bloqueado Dark Cinema en `index.html` (`data-theme="dark" data-theme-locked="dark"`) y `js/utils/themeManager.js` mediante `dataset.themeLocked` sin alterar `localStorage.hub_theme`.
  * `src/presentation/public/js/landing/world-math.js` y `src/presentation/public/js/landing/world.js`: esfera/astrolabio 360° texturizada con mapa equirectangular 2:1 sobre fondo puro `#050507` (sin imagen estática detrás de la esfera), órbita por arrastre (`touch-action: pan-y`), sincronización cromática (`hub:product-focus`) y botón `Pausar animación`.
  * Actualizados `index.html` (`<picture>` V6 en `data-media-slot="hero"`), `landing-home.css`, `landing-home.js`, `landing/media-config.js` (`hero.enabled = false`), `landing/demos.js`, `landing/motion.js` (sticky hero + profundidad 2.5D en `S03`/`S04`) y `public-shell.css`.
* **Paso C (Consola de Estudio y Páginas Secundarias):**
  * Refinados `theme.css`, `workspace.css`, `workspace-simulator.css`, `workspace-study.css`, `workspace-repaso.css`, `bulletin.css` y `pricing.css` con superficies oscuras neutras (`#050507`, `#0D0D10`, `#141418`), bordes gradiente `1px` selectivos únicamente en elementos focales (`mode-card--study` con variante teal en `medicina` y `plan-tile--featured`), y retroalimentación táctil sutil respetando `prefers-reduced-motion`.
* **Paso D (Pruebas Unitarias, Documentación y Pendientes Locales):**
  * Añadidas pruebas unitarias en `tests/unit/landingWorld.test.js` y ampliado `tests/unit/themeManager.test.js`; actualizados `DESIGN_SYSTEM.md`, `LANDING_FRONTEND_GUIDE.md` y `WORKSPACE_FRONTEND_GUIDE.md`.
  * **Pendiente de ejecución por el usuario en su terminal local:** correr `npm run build` (actualiza `?v=` determinista en HTML y módulos locales vía `update-cache.js`), `npm test -- --runInBand` e inspección visual en navegador (`1440×900` y `390×844`), ya que el directorio de trabajo de terminal de esta sesión permaneció bloqueado en la ruta eliminada `HubSaludApp`.
