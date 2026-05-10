# 🧩 Guía de Componentes de UI: Hub Academia

Esta documentación detalla el funcionamiento del sistema de notificaciones, modales, plantillas y gestión de la biblioteca personal de la plataforma. El objetivo es centralizar el feedback del usuario y mantener una arquitectura de componentes limpia y premium.

---

## 1. 📢 UIManager (`uiManager.js`)

El `UIManager` es el orquestador global de la interfaz. Maneja notificaciones no intrusivas, estados de red y visores de medios.

### 1.1. Sistema de Notificaciones (Toasts)
Utilizado para dar feedback rápido (éxito, error, advertencia) sin interrumpir el flujo del usuario.

**Uso:**
```javascript
// Notificación de éxito
window.uiManager.showToast('✅ ¡Cambios guardados con éxito!');

// Notificación de error
window.uiManager.showToast('❌ Error al procesar la solicitud.');

// Notificación de advertencia
window.uiManager.showToast('⚠️ Faltan campos por completar.');
```

**Arquitectura:**
- **Z-Index:** Las notificaciones tienen un `z-index: 2147483647` (el máximo absoluto), lo que garantiza que siempre se vean por encima de cualquier modal o visor.
- **Auto-hide:** Se ocultan automáticamente tras 4 segundos.

### 1.2. Monitor de Conectividad
Muestra una "píldora" de estado cuando el usuario pierde la conexión, informando que el sistema entrará en modo resiliencia (trabajo local).

---

## 2. Modales y Bloqueo de Scroll (Global)

Para garantizar una experiencia premium y evitar el "Scroll Chaining" (cuando el fondo se mueve al llegar al límite del modal), Hub Academia utiliza un estándar global:

### Estándar de Implementación:
1.  **CSS Bloqueo:** Siempre se debe usar la clase `.modal-open` en el `body` para desactivar el scroll de fondo.
2.  **Overscroll Behavior:** Los contenedores de los modales (`.modal-overlay` y `.modal-body`) deben tener `overscroll-behavior: contain;`.
3.  **Gestión JS:** Todos los modales deben registrarse mediante `window.uiManager.pushModalState(id)` y cerrarse con `popModalState(id)`.

```css
/* modal.css */
body.modal-open {
    overflow: hidden !important;
}

.modal-body {
    overscroll-behavior: contain;
}
```

### Estética Premium (Glassmorphism):
- **Overlay:** `rgba(0, 0, 0, 0.85)` con `backdrop-filter: blur(10px)`.
- **Z-Index:** El estándar global para modales es `2000000` para asegurar que floten sobre cabeceras y otros elementos de la UI.

---

## 3. 🪟 ConfirmationModal (`confirmationModal.js`)

Componente premium que reemplaza a `confirm()` y `alert()` nativos. Utiliza promesas para una integración limpia con `async/await`.

### 3.1. Confirmación de Acción
Para acciones que requieren consentimiento (ej. eliminar una tarjeta).

**Uso:**
```javascript
const confirmed = await window.confirmationModal.show(
    '¿Estás seguro de eliminar esta tarjeta?', 
    'Eliminar Contenido', 
    'Sí, eliminar', 
    'Cancelar'
);

if (confirmed) {
    // Proceder con la eliminación
}
```

### 2.2. Alerta de Usuario (Aviso)
Para mensajes que el usuario debe leer y aceptar obligatoriamente.

**Uso:**
```javascript
await window.confirmationModal.showAlert(
    'Tu suscripción ha expirado. Por favor, actualiza tu plan.', 
    'Aviso de Cuenta'
);
```

---

## 3. 🎨 Plantillas de Componentes (`components.js`)

Este archivo contiene funciones "puras" que generan estructuras HTML dinámicas basadas en datos. Ayuda a separar la lógica de negocio (en `search.js` o `admin.js`) de la presentación.

### 3.1. Funcionalidad de Carruseles
Incluye lógica global para el desplazamiento suave (`smooth scroll`) de carruseles y la inicialización automática de botones de navegación.

**Uso de Inicialización:**
```javascript
// Detecta si el carrusel tiene overflow y muestra/ocultar flechas automáticamente
window.initializeCarousel('mi-contenedor-id');
```

---

## 4. 📚 Mi Biblioteca UI (`libraryUI.js`)

Controlador premium para el "Drawer" (panel lateral) de recursos guardados, favoritos y notas personales.

### 4.1. Gestión de Estados
Actualiza automáticamente todos los iconos de "Guardar" o "Favorito" en la página mediante un `MutationObserver`.

### 4.2. Editor de Notas Premium
Incluye un sistema de edición con soporte para Markdown y selección de colores personalizados. Utiliza `window.confirmationModal` para confirmaciones de borrado.

---

## 5. 🏗️ Jerarquía Visual y Z-Index

Para evitar colisiones visuales ("z-index wars"), se ha establecido el siguiente estándar de capas:

| Capa | Z-Index | Descripción |
| :--- | :--- | :--- |
| **Notifications (Toasts)** | `2147483647` | Nivel máximo. Nada puede tapar una notificación. |
| **Modales (Overlays)** | `2000000` | Modales de creación, edición y configuración. |
| **Header / Navigation** | `1000` | Menú superior y navegación persistente. |
| **Main Content** | `1` - `100` | Flujo normal de la página. |

> [!IMPORTANT]
> Nunca uses un `z-index` superior a `2,000,000` en componentes de página regulares. El rango superior está reservado exclusivamente para el sistema de feedback global (`UIManager`).

---

## 4. 📚 Mejores Prácticas para Desarrolladores

1. **Eradicación de `alert()`:** Está prohibido el uso de `alert()` o `confirm()` nativos. Siempre utiliza `window.uiManager.showToast()` o `window.confirmationModal`.
2. **Contexto de Modal:** Al abrir una modal manual, asegúrate de añadir la clase `active` al overlay para disparar las animaciones y el `backdrop-filter`.
3. **Escucha de 'Escape':** Los componentes de UI en esta carpeta ya manejan el cierre automáticamente con la tecla `Escape` y clics fuera del contenedor principal.
4. **Caché de Scripts:** Al realizar cambios en estos archivos core, recuerda actualizar la versión en el HTML (ej: `uiManager.js?v=v2`) para que los usuarios reciban la actualización de inmediato.
