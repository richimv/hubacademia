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

---

> [!IMPORTANT]
> Ningún elemento debe usar bordes de colores sólidos o brillantes a menos que sea un estado de error (`#ef4444`) o éxito (`#10b981`). Los bordes deben ser siempre translúcidos para integrarse con el fondo negro.
