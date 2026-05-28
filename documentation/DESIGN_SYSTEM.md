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
- **Tarjetas de Simuladores (Simulators Hub):**
  - Poseen un tamaño profesional ampliado (`min-height: 320px`).
  - Cuentan con un gradiente oscuro (`linear-gradient(180deg, rgba(5,5,5,0.25) 0%, rgba(5,5,5,0.85) 100%)`) a través de un pseudo-elemento `::before` para asegurar contraste tipográfico del texto blanco sobre las imágenes WebP.
  - Utilizan fondos responsivos enlazados a `/assets/bg-sim-...webp`.

---

> [!IMPORTANT]
> Ningún elemento debe usar bordes de colores sólidos o brillantes a menos que sea un estado de error (`#ef4444`) o éxito (`#10b981`). Los bordes deben ser siempre translúcidos para integrarse con el fondo negro.

