# 🎨 Design System & Branding: Hub Academia v3.0

**Estado:** Fuente de Verdad (Single Source of Truth)  
**Versión:** 3.0  
**Enfoque Estético:** Dark Mode Premium / Cyber-Minimalist / Glassmorphism

Este documento define las reglas visuales, componentes interactivos y directrices de experiencia de usuario (UX) para **Hub Academia**. Sirve como guía de referencia obligatoria para mantener la coherencia en todas las interfaces de la plataforma.

---

## 📌 Tabla de Contenidos
1. [🌈 Paleta de Colores (The Manta Palette)](#1--paleta-de-colores-the-manta-palette)
2. [🔤 Tipografía y Jerarquía](#2--tipografía-y-jerarquía)
3. [🔲 Componentes Core](#3--componentes-core)
4. [📐 Grids, Layouts y Responsividad](#4--grids-layouts-y-responsividad)
5. [✨ Micro-interacciones y Efectos](#5--micro-interacciones-y-efectos)
6. [🚀 Reglas UX Mandatorias](#6--reglas-ux-mandatorias)
7. [🎨 Iconografía (Font Awesome 6.4.0)](#7--iconografía-font-awesome-640)

---

## 1. 🌈 Paleta de Colores (The Manta Palette)

Nuestro diseño se aleja de los grises estándar y abraza el negro puro con acentos vibrantes de azul y púrpura para denotar tecnología y confianza.

| Elemento | Variable CSS | Hex Code | Uso Principal |
| :--- | :--- | :--- | :--- |
| **Deep Black (Main)** | `--bg-main` | `#050505` | Fondo principal de la página (`body`). |
| **Matte Black (Surface)** | `--bg-secondary` | `#0a0a0a` | Fondo de modales, sidebars y contenedores secundarios. |
| **Dark Slate (Tertiary)** | `--bg-tertiary` | `#121212` | Tarjetas, inputs y elementos de elevación. |
| **Trust Blue (Primary)** | `--primary` | `#3b82f6` | Botones de acción principal, enlaces activos. |
| **Electric Blue (Accent)** | `--primary-hover` | `#60a5fa` | Bordes glow, gradientes y estados de hover. |
| **Royal Purple (Accent)** | `--accent-purple` | `#8b5cf6` | Gradientes secundarios (Quiz Arena, Premium). |
| **Slate Gray (Text)** | `--text-muted` | `#94a3b8` | Texto secundario, descripciones y placeholders. |
| **Pure White (Text)** | `--text-main` | `#f8fafc` | Títulos y contenido principal. |

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

### 3.1. Modales (The "Edit Profile" Standard)
Todas las ventanas modales de la plataforma deben seguir este patrón visual exacto para mantener la consistencia:
* **Fondo:** `#0a0a0a` (Matte Black) con opacidad del 96% en overlay.
* **Borde:** `1px solid rgba(59, 130, 246, 0.2)` (Subtle Blue Glow).
* **Esquinas:** `24px` (Rounded).
* **Sombra:** `0 25px 50px -12px rgba(0, 0, 0, 0.8)`.
* **Backdrop Filter:** `blur(12px)` en el overlay de fondo (`.modal-overlay` / `.note-modal-overlay`).
* **Nesting UX de Títulos:** 
  > [!IMPORTANT]
  > Para evitar la duplicación de títulos en los modales de lectura/edición:
  > 1. El encabezado superior del modal (`.note-modal-header`) debe mostrar únicamente la **categoría o fuente del recurso** (ej. *Nota de Repaso*, *Nota de Chat*, *Nueva Nota*).
  > 2. El **título específico del elemento** debe inyectarse exclusivamente dentro del cuerpo del visor (`.note-viewer-title`), logrando una jerarquía limpia y sin redundancia.

### 3.2. Botones (Premium Buttons)
* **Botón Primario (`.btn-primary`):** 
  * Fondo: `#3b82f6` (Trust Blue) o degradado a `#8b5cf6`.
  * Radio de borde: `12px` | Altura: `48px` (estándar para interacción cómoda en móviles).
  * Hover: `translateY(-2px)` con un leve brillo de fondo (`box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3)`).
* **Botón Secundario / Outline (`.btn-outline`):**
  * Fondo: transparente o `rgba(255, 255, 255, 0.02)`.
  * Borde: `1px solid rgba(255, 255, 255, 0.08)`.
  * Hover: `background: rgba(255, 255, 255, 0.06); border-color: rgba(255, 255, 255, 0.15)`.

### 3.3. Inputs y Form Controles
* **Fondo:** `rgba(15, 23, 42, 0.5)` (Oscuro semitransparente).
* **Borde:** `1px solid rgba(255, 255, 255, 0.08)`.
* **Focus State:** Borde cambia a `#3b82f6` con un shadow azul difuminado (`box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15)`).
* **Borde de Esquinas:** `10px`.

---

## 4. 📐 Grids, Layouts y Responsividad

### 4.1. Cuadrícula de Biblioteca (Resources Grid)
La cuadrícula de catálogo de recursos de biblioteca debe ser uniforme y fluida:
* **Escritorio (> 1200px):** Exactamente **6 columnas por fila** (`repeat(6, minmax(0, 1fr))`) para optimizar el espacio sin saturar.
* **Portátiles Medianos (900px a 1200px):** **4 columnas por fila** (`repeat(4, minmax(0, 1fr))`).
* **Tabletas (600px a 900px):** **3 columnas por fila** (`repeat(3, minmax(0, 1fr))`).
* **Celulares (<= 600px):** **2 columnas por fila** (`repeat(2, minmax(0, 1fr))`) con brecha de espacio reducida a `0.75rem`.

### 4.2. Tarjetas de Modos de Entrenamiento (Grid & Stack)
Para evitar el solapamiento responsivo:
* **PC & Tabletas (>= 768px):** Muestra **3 columnas** (`repeat(3, 1fr)`) con flexibidad de altura (`aspect-ratio: auto; min-height: 165px;`).
* **Tabletas / Móvil (<= 768px):** Transiciona a **2 columnas** (`1fr 1fr`).
* **Móviles (<= 520px):** Apilamiento en **1 columna** (`1fr`) con ancho máximo centrado (`max-width: 450px; margin: 0 auto;`).

---

## 5. ✨ Micro-interacciones y Efectos

* **Cuadrícula de Puntos de Fondo (Dotted Grid):**
  * Para agregar textura tecnológica sutil en los contenedores de sección, usar un degradado de fondo punteado:
    `background-image: radial-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px); background-size: 24px 24px;`
* **Brillo de Acento (Glow hover effect):**
  * Las tarjetas interactivas de previsualización deben reaccionar al pasar el cursor cambiando la opacidad del borde y aplicando una sombra del color de acento de la sección (ej. azul para Salud, morado para Educación, rosa para Idiomas).
* **Curva de Transición Estándar:**
  * Todas las micro-animaciones (escala de botones, transiciones de color de borde, giros de avatares) deben utilizar:
    `transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);`

---

## 6. 🚀 Reglas UX Mandatorias

1. **Bordes Translúcidos:** 
   > [!WARNING]
   > Ningún elemento del cuerpo principal debe usar bordes de colores sólidos o brillantes a menos que represente un estado crítico de error (`#ef4444`) o éxito (`#10b981`). Los bordes decorativos estándar deben ser translúcidos (`rgba(255, 255, 255, 0.08)`) para fundirse armoniosamente con el fondo negro puro.
2. **Mitigación de Parpadeo de Carga (FOUC):**
   * Vincular siempre `sidebar.css` and `theme.css` estáticamente en la cabecera `<head>` de los HTML para asegurar que el navegador cargue los estilos de la barra lateral antes del renderizado de la estructura.
3. **Consistencia en Exámenes y Quizzes:**
   * Las preguntas deben tener tipografía legible `'Inter'` en tamaño mínimo `1.25rem` (móvil) / `1.5rem` (PC) y las respuestas/explicaciones no deben superarla, manteniendo un tamaño sutilmente menor (`1.1rem` / `1.35rem`).

---

## 7. 🎨 Iconografía (Font Awesome 6.4.0)

* **Biblioteca Estándar:** Para mantener un rendimiento óptimo y coherencia visual en toda la plataforma, el proyecto utiliza de forma exclusiva y unificada **Font Awesome v6.4.0** a través de CDN.
* **Enlace CDN Único:** Todas las páginas HTML deben cargar exactamente el siguiente stylesheet en su cabecera `<head>`:
  `<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">`
* **Uso Estándar:** La iconografía debe implementarse mediante la sintaxis nativa de Font Awesome (ej. `<i class="fas fa-search"></i>`), evitando librerías alternativas como Lucide para garantizar la ligereza y velocidad de carga de la plataforma.
* **Asignación de Icono de Biblioteca:** El icono de la **Biblioteca de Recursos** (tanto en el menú lateral global como en el botón flotante del drawer) se ha unificado bajo la clase `fas fa-book` (Libro clásico cerrado) en lugar del icono anterior de capas apiladas (`fas fa-layer-group`).
