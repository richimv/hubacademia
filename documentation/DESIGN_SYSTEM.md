# 🎨 Design System & Branding: Hub Academia v3.0

**Estado:** Fuente de Verdad (Single Source of Truth)  
**Versión:** 3.0  
**Enfoque Estético:** Dark Mode Premium Matte Black / Cyber-Minimalist / Manta Pill Gradients

Este documento define las reglas visuales, componentes interactivos y directrices de experiencia de usuario (UX) para **Hub Academia**. Sirve como guía de referencia obligatoria para mantener la coherencia en todas las interfaces de la plataforma.

---

## 📌 Tabla de Contenidos
1. [🌈 Paleta de Colores (The Manta Matte Black Scale)](#1--paleta-de-colores-the-manta-matte-black-scale)
2. [🔤 Tipografía y Jerarquía](#2--tipografía-y-jerarquía)
3. [🔲 Componentes Core](#3--componentes-core)
4. [📐 Grids, Layouts y Responsividad](#4--grids-layouts-y-responsividad)
5. [✨ Micro-interacciones y Efectos](#5--micro-interacciones-y-efectos)
6. [🚀 Reglas UX Mandatorias](#6--reglas-ux-mandatorias)
7. [🎨 Iconografía (Font Awesome 6.4.0)](#7--iconografía-font-awesome-640)

---

## 1. 🌈 Paleta de Colores (The Pure Matte Black Scale)

Toda la plataforma se rige estrictamente bajo la paleta de **Negro Mate Puro en todas sus variantes**, eliminando por completo cualquier tinte o fondo azulado (como `#0f172a`, `#0d1424` o `#1e293b`) de tarjetas, paneles, inputs y contenedores modales. Los acentos de color se reservan exclusivamente para componentes interactivos (botones de acción, insignias de estado e iconos).

| Elemento | Variable CSS | Hex / RGBA Code | Uso Principal |
| :--- | :--- | :--- | :--- |
| **Deep Black (Main Background)** | `--bg-main` | `#050505` | Fondo principal de todas las páginas (`body`). |
| **Pure Matte Black (Card/Modal Surface)** | `--bg-secondary` / `--card-bg` | `#0a0a0a` | Tarjetas hero, paneles principales y cuerpo de modales (sólido no transparente). |
| **Dark Slate Matte (Nested Surface)** | `--bg-tertiary` / `--surface-hover` | `#121212` / `#18181b` | Sub-tarjetas anidadas, inputs, selectores y elementos de elevación interna. |
| **Clean Translucent White (Hover Surface)**| `--hover-clean` | `rgba(255, 255, 255, 0.06)` a `0.08` | Relleno homogéneo al pasar el cursor (hover) en ítems del explorador, filas de tarjetas y botones secundarios. Queda prohibido el uso de rellenos plomos/azulados (`#334155`, `rgba(51, 65, 85, ...)`). |
| **Manta Orange Gradient (Repaso / Core CTA)** | `--gradient-orange` | `linear-gradient(135deg, #f97316 0%, #ea580c 100%)` | Acciones primarias en Repaso (Estudiar Ahora, Crear Mazo, Clonar), pestañas activas y acentos del módulo. |
| **Manta Orange Glow** | `--glow-orange` | `rgba(249, 115, 22, 0.35)` | Sombras iluminadas y halos coherentes en botones primarios y tarjetas destacadas. |
| **Cyan-Blue Gradient (Primary Action)** | `--gradient-primary` | `linear-gradient(90deg, #4f46e5 0%, #3b82f6 50%, #06b6d4 100%)` | Botones de acción principal en Simulator / Chat (Explorar, Confirmar, Suscribir). |
| **Trust Blue (Solid Accent)** | `--primary` | `#3b82f6` | Enlaces activos e iconos de estado en Simulador. |
| **Electric Blue (Light Accent)** | `--primary-light` | `#60a5fa` | Resaltados de texto e interacciones secundarias. |
| **Emerald Green (Status)** | `--success` | `rgba(16, 185, 129, 0.12)` / `#34d399` | Insignias de verificación y tarjetas dominadas. |
| **Subtle Border** | `--border-color` | `rgba(255, 255, 255, 0.08)` | Bordes decorativos translúcidos. |
| **Slate Gray (Text Muted)** | `--text-muted` | `#94a3b8` | Subtítulos, descripciones secundarias y placeholders. |
| **Pure White (Text Main)** | `--text-main` | `#ffffff` | Encabezados, títulos de tarjetas y texto de botones. |

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
* **Ítems de Consumo (`.usage-item`):** Fondo `#121212`, borde `rgba(255,255,255,0.08)`, ajuste automático de texto con `word-break: break-word` e indicadores de cuotas en tiempo real.

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
