# 🎨 Design System & Branding: Hub Academia v3.0

**Estado:** Fuente de Verdad (Single Source of Truth)  
**Versión:** 1.0  
**Estética:** Dark Mode Premium / Cyber-Minimalist / Glassmorphism

---

## 1. 🌈 Paleta de Colores (The Manta Palette)

Nuestro diseño se aleja de los grises estándar y abraza el negro puro con acentos vibrantes de azul y púrpura para denotar tecnología y confianza.

| Elemento | Hex Code | Uso |
| :--- | :--- | :--- |
| **Deep Black (Main)** | `#050505` | Fondo principal de la página (`body`). |
| **Matte Black (Surface)** | `#0a0a0a` | Fondo de modales y contenedores secundarios. |
| **Dark Slate (Tertiary)** | `#121212` | Tarjetas, inputs y elementos de elevación. |
| **Trust Blue (Primary)** | `#3b82f6` | Botones de acción principal, enlaces activos. |
| **Electric Blue (Accent)** | `#60a5fa` | Bordes glow, gradientes y estados de hover. |
| **Royal Purple (Accent)** | `#8b5cf6` | Gradientes secundarios (Quiz Arena, Premium). |
| **Slate Gray (Text)** | `#94a3b8` | Texto secundario y descriptivo. |
| **Pure White (Text)** | `#f8fafc` | Títulos y contenido principal. |

---

## 2. 🔲 Componentes Core

### 2.1. Modales (The "Edit Profile" Standard)
Todas las ventanas modales deben seguir este patrón visual:
- **Fondo:** `#0a0a0a` (Matte Black).
- **Borde:** `1px solid rgba(59, 130, 246, 0.2)` (Subtle Blue Glow).
- **Esquinas:** `24px` (Rounded).
- **Sombra:** `0 25px 50px -12px rgba(0, 0, 0, 0.8)`.
- **Backdrop:** `blur(12px)` con fondo negro translúcido.

### 2.2. Botones (Premium Buttons)
- **Primary:** Fondo azul sólido (`#3b82f6`), texto blanco, radio `12px`. Efecto hover: `translateY(-2px)` con sombra azul.
- **Secondary/Outlined:** Fondo transparente o `#121212`, borde `1px solid rgba(255,255,255,0.1)`, texto blanco.
- **Glass:** Botones con `backdrop-filter: blur(10px)` para interfaces flotantes.

### 2.3. Inputs
- **Fondo:** `rgba(15, 23, 42, 0.6)`.
- **Borde:** `1px solid rgba(255, 255, 255, 0.1)`.
- **Focus:** Cambia el borde a `#60a5fa` con un `box-shadow` suave.

---

## 3. 📄 Layout & Espaciado
- **Contenedores:** Edge-to-Edge con un `max-width` sugerido de `1400px` para ultra-wide, pero manteniendo márgenes laterales de `1rem` a `8%` según el breakpoint.
- **Tipografía:** `Inter` como fuente principal. Títulos en `ExtraBold` (800) con `letter-spacing: -0.02em`.

---

## 4. 🚀 Aplicación Práctica
- **Tarjetas de Perfil:** Eliminar el fondo azulado antiguo (`#1e293b`). Usar `#0a0a0a` con bordes sutiles.
- **Gradientes:** Preferir gradientes de 135 grados de Azul a Púrpura para elementos "Gamificados" o "Premium".
- **Cabecera Global & Logotipo:**
  - El logotipo y texto `.logo-text` de la cabecera deben mostrarse siempre con la tipografía premium (`Inter` o similar) y texto degradado.
  - En móviles, `.logo` se centra de forma absoluta en el `.main-header`. No se usan botones "Volver" en la cabecera global.
- **Barra Lateral (Sidebar):**
  - La cabecera del Sidebar no tiene logo ni texto de marca, únicamente el botón de hamburguesa.
  - El botón de hamburguesa se alinea a la derecha en modo expandido (`justify-content: flex-end`) y al centro en modo colapsado.
  - La sección "Mi Cuenta" (`#sidebar-section-account`) debe ocultarse por completo si el usuario no ha iniciado sesión.
  - Los enlaces de redes sociales (Facebook, Instagram, TikTok) se integran al final del menú lateral en una sección dedicada "Síguenos" con botones cuadrados y efecto hover premium, visibles permanentemente para todos los usuarios.
- **Footer Global:**
  - El footer se estructura en exactamente 3 columnas en escritorio (Marca, Explorar, Legal y Ayuda) y se reorganiza en 2 columnas en teléfonos móviles. No se permiten redes sociales ni secciones redundantes ("Síguenos") en el footer de ninguna página para evitar saturar la interfaz móvil.
- **Tarjetas de Simuladores (Simulators Hub) & Modos de Entrenamiento:**
  - Las tarjetas de modo (`.mode-card`) poseen un diseño de vidrio soplado (glassmorphic) con `backdrop-filter: blur(12px)` y fondos oscuros (`rgba(10, 13, 18, 0.45)`).
  - Los bordes están tintados translúcidos al 15% según el color de acento (`--accent-rgb`), y en hover se expanden con sombra brillante (`box-shadow`) y elevación vertical.
  - La línea decorativa izquierda (`::before`) se dibuja desde el borde superior de la tarjeta y termina alineada exactamente con la base del título, creciendo dinámicamente en hover como micro-animación.
  - La máscara de contraste (`::after`) utiliza un gradiente horizontal de izquierda (muy oscuro, para legibilidad del texto) a derecha (translúcido) con un foco radial en hover.
  - Los botones `.mode-cta` están diseñados como píldoras de contorno (outline pills) translúcidas en reposo, y se rellenan completamente con su respectivo color de acento en hover.
- **Filtro Activo / Resumen de Configuración (#active-config-summary):**
  - Se descartan las alertas de color verde plano. Se adopta una barra de estado tipo cápsula oscura (`rgba(30, 41, 59, 0.22)`) con borde azul eléctrico y píldoras separadas (`.config-summary-pill`) para Target, Carrera/Dificultad y número de áreas, logrando modularidad visual.
- **Rediseño del Hero y Panel de Estadísticas (PC & Celular):**
  - Se implementó un panel de estadísticas modular (`.hero-stats-panel`) que organiza métricas clave de atracción (`1K+` Usuarios Activos, `120K+` Preguntas, `98%` Tasa de Satisfacción, `24/7` Tutoría) usando gradientes de cian a púrpura en los números.
  - En móviles, el slider de hero (`#hero-slider`) tiene una altura mínima de `800px` y la imagen `portada-mobil.png` se ancla al final mediante `object-position: center bottom`. El título desplaza la palabra "Inteligente" a una línea propia en gradiente y todos los elementos se centran verticalmente con un amplio padding inferior (`320px`) para mantener visible la laptop.
- **Tipografía y Claridad en Quizzes y Exámenes Resueltos:**
  - Se unificó la tipografía `'Inter', sans-serif` en todas las pantallas de preguntas y respuestas.
  - Se aumentó el tamaño y brillo de las opciones (`1.25rem`, color `#f1f5f9` para eliminar la opacidad) en el quiz activo, manteniendo el texto de la pregunta en `1.5rem`. La explicación (`#explanationText`) se fijó en `1.45rem !important` para estar a la par de la pregunta sin superarla.
  - En la página de examen resuelto (Review Cards), las preguntas miden `1.4rem`, las opciones `1.2rem` (aclaradas a `#f1f5f9`), y la explicación se fijó en `1.35rem !important`.
  - En móviles, se aplican escalas coherentes (quiz activo: pregunta `1.25rem`, opciones `1.05rem`, explicación `1.15rem`; revisión: pregunta `1.15rem`, opciones `1.05rem`, explicación `1.1rem`).

- **Mitigación de Parpadeo de Carga (FOUC) en Barra Lateral:**
  - Se vincula estáticamente `sidebar.css` en el `<head>` de todas las páginas HTML principales (`index`, `dashboard`, `simulator-dashboard`, etc.) para asegurar que el navegador cargue, analice y aplique las reglas de visualización y plegado antes de comenzar a renderizar el cuerpo de la página.
- **Refinamiento de Tarjetas de Modos de Entrenamiento:**
  - Se aumentó el padding superior de `.mode-card` a `3rem` en PC (`2.25rem` en móviles) para centrar verticalmente los bloques de título y descripción.
  - La línea decorativa izquierda (`::before`) mide exactamente `5.6rem` (hover `6.2rem`) en PC y `4.45rem` (hover `5.0rem`) en móviles, alineándose con precisión matemática con la línea base del título.
  - Se ajustó el breakpoint responsivo de encolado `.modes-grid` a `900px` para evitar saltos prematuros de cuadrícula.
- **Tooltips Informativos de KPIs:**
  - Se agregaron íconos informativos discretos `.kpi-info-container` en los tres gráficos de diagnóstico en `simulator-dashboard.html`.
  - Diseñados en estilo vidrio soplado oscuro (`rgba(10,10,10,0.96)`) con bordes translúcidos y desenfoque (`backdrop-filter: blur(12px)`).
  - Los textos se cargan dinámicamente en `simulator-dash.js` de acuerdo al contexto del módulo cargado (Especialidades Clínicas para Salud, Áreas Pedagógicas para Educación, Ejes Temáticos para Idiomas).

---

## 5. 🎨 Iconografía (Font Awesome 6.4.0)
- **Biblioteca Estándar:** Para mantener un rendimiento óptimo y coherencia visual en toda la plataforma, el proyecto utiliza de forma exclusiva y unificada **Font Awesome v6.4.0** a través de CDN.
- **Enlace CDN Único:** Todas las páginas HTML deben cargar exactamente el siguiente stylesheet en su cabecera `<head>`:
  `<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">`
- **Uso Estándar:** La iconografía debe implementarse mediante la sintaxis nativa de Font Awesome (ej. `<i class="fas fa-search"></i>`), evitando librerías alternativas como Lucide para garantizar la ligereza y velocidad de carga de la plataforma.
- **Asignación de Icono de Biblioteca:** El icono de la **Biblioteca de Recursos** (tanto en el menú lateral global como en el botón flotante del drawer) se ha unificado bajo la clase `fas fa-book` (Libro clásico cerrado) en lugar del icono anterior de capas apiladas (`fas fa-layer-group`).

---

> [!IMPORTANT]
> Ningún elemento debe usar bordes de colores sólidos o brillantes a menos que sea un estado de error (`#ef4444`) o éxito (`#10b981`). Los bordes deben ser siempre translúcidos para integrarse con el fondo negro.


