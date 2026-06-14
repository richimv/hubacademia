# 📱 Arquitectura Técnica de la Aplicación Celular: Hub Academia Móvil

**Estado:** Documento de Verdad (Single Source of Truth)  
**Versión:** 1.2 (v1.0 Completa con Google Auth y NetworkService)  
**Entorno:** Expo SDK 56 / React Native  

---

## 1. 🏗️ Arquitectura de 4 Capas (Clean Architecture)

La estructura de la aplicación móvil se organiza estrictamente en cuatro capas limpias para garantizar desacoplamiento y consistencia:

```text
hubacademiaApp/
├── app/                        # Rutas y Pantallas de la App (Expo Router)
│   ├── (tabs)/                 # Pestañas inferiores nativas
│   │   ├── _layout.tsx         # Layout de pestañas + Header Universal responsivo
│   │   ├── home.tsx            # Pestaña 1: Inicio responsivo (Clonación de web)
│   │   ├── library.tsx         # Pestaña 2: Biblioteca Virtual (3 columnas)
│   │   ├── tutor.tsx           # Pestaña 3: Tutor IA (RAG con selector)
│   │   ├── simulators.tsx      # Pestaña 4: Simuladores (Exámenes interactivos)
│   │   ├── review.tsx          # Pestaña 5: Repaso (Flashcards 3D con neon glow)
│   │   └── profile.tsx         # Pestaña 6: Perfil (Deshabilitado de la barra inferior)
│   ├── _layout.tsx             # Envoltorio global + Deep Link OAuth + Simulador Web
│   └── index.tsx               # Pantalla de bienvenida Splash animada
│
├── src/
│   ├── presentation/           # CAPA 1: Componentes UI, Hooks de Vista, Temas y Estilos
│   │   ├── components/         # Botones, GlassCard, Inputs y elementos gráficos
│   │   ├── styles/             # Manta Palette y tokens de estilo
│   │   └── hooks/              # Hooks visuales y animaciones
│   │
│   ├── application/            # CAPA 2: Controladores de estado global de la aplicación
│   │   ├── context/            # AuthContext (Google OAuth & Supabase)
│   │   └── state/              # Lógica de navegación y flujos
│   │
│   ├── domain/                 # CAPA 3: Tipos TypeScript y entidades puras de negocio
│   │   ├── types/              # Modelos de datos compartidos (Usuario, Cursos, Libros)
│   │   └── models/             # Reglas de negocio puras
│   │
│   └── infrastructure/         # CAPA 4: Conectores externos, clientes de bases de datos y persistencia
│       ├── supabase/           # Cliente de Supabase móvil
│       ├── network/            # NetworkService (Inyección de tokens JWT y resiliencia)
│       └── storage/            # AsyncStorage / SecureStore
```

---

## 2. 🎨 Sistema de Diseño Móvil (The Manta Palette)

El diseño de la app celular hereda el tema **Dark Mode Premium / Cyber-Minimalist** del proyecto central:

| Elemento | Código HEX | Rol en Móvil |
| :--- | :--- | :--- |
| **Deep Black** | `#050505` | Fondo principal de pantallas (`background`). |
| **Matte Black** | `#0a0a0a` | Fondo de modales, hojas de pestañas y contenedores. |
| **Dark Slate** | `#121212` | Elevaciones secundarias, tarjetas principales e inputs. |
| **Trust Blue** | `#3b82f6` | Botón principal de acciones (`btnPrimary`). |
| **Electric Blue** | `#60a5fa` | Bordes activos, textos en foco y orbes decorativos. |
| **Royal Purple** | `#8b5cf6` | Acento premium y gradientes de 135° (Quiz Arena). |
| **Slate Gray** | `#94a3b8` | Texto secundario y descriptivos. |
| **Pure White** | `#f8fafc` | Títulos y texto en alto contraste. |

### Componente Clave: Glassmorphism (`GlassCard.tsx`)
Para emular el efecto de "vidrio soplado" en el celular sin ralentizar el rendimiento de GPU:
*   Fondo: `rgba(18, 18, 18, 0.65)` (Fusión de Matte Black y Dark Slate con opacidad).
*   Borde: `1px solid rgba(96, 165, 250, 0.18)` (Electric Blue translúcido).
*   Sombra: `elevation: 8` en Android y `shadowOpacity: 0.5` en iOS para dar volumen tridimensional.

---

## 3. 🔐 Autenticación Google OAuth & Supabase Móvil

*   **Google OAuth Integrado:** La app implementa el flujo OAuth a través de `supabase.auth.signInWithOAuth` usando `WebBrowser` de Expo.
*   **Deep Link de Retorno:** Se configuró el esquema `hubacademiaapp://google-auth` para regresar a la aplicación de manera automática.
*   **Persistencia:** La sesión de usuario es almacenada de forma encriptada en el hardware mediante `SecureStore` de Expo para resiliencia y auto-login tras cierres involuntarios.

---

## 4. ⚡ Gateway de Red: `NetworkService.ts`

El canal de red móvil centraliza la comunicación HTTP:
*   **Token JWT Automático:** Lee en caliente la sesión de Supabase y añade la cabecera `Authorization: Bearer <token>`.
*   **Soft Fallback (Resiliencia):** Reintenta de forma automática las llamadas tras 800ms en caso de inestabilidad de conexión local.
*   **Control 401:** Purga de forma segura la sesión y redirige al Splash screen en caso de expiración del token.

---

## 🚀 Guía de Ejecución Local y Desarrollo

### Requisitos Previos
*   Node.js v18+ instalado.
*   Dispositivo móvil físico con la aplicación **Expo Go** (disponible en Play Store / App Store) o emulador configurado.

### Comandos de Ejecución

1.  **Instalar dependencias:**
    ```bash
    cd hubacademiaApp
    npm install
    ```
2.  **Iniciar Servidor de Desarrollo:**
    ```bash
    npm run start
    # o npx expo start
    ```
3.  **Iniciar en Dispositivo:**
    *   **Android Emulador:** Presiona `a` en la terminal.
    *   **iOS Simulador:** Presiona `i` en la terminal (requiere macOS).
    *   **Dispositivo Físico:** Escanea el código QR que se muestra en la terminal con la cámara (iOS) o la app Expo Go (Android).
