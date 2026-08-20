# 🧩 Guía Maestra de Componentes de UI: Hub Academia

> **Versión:** 2.0.0  
> **Área:** Presentation Layer / UI & UX Core Components  
> **Archivos Fuente:** `src/presentation/public/js/ui/` (`uiManager.js`, `confirmationModal.js`, `tooltipManager.js`, `components.js`, `libraryUI.js`)

Esta documentación técnica detalla la arquitectura, APIs y estándares de implementación de los componentes interactivos centrales de la plataforma: **alertas, notificaciones (toasts), modales de sistema, tooltips contextuales, tours de onboarding y gestión de biblioteca**.

---

## 1. 📢 UIManager (`uiManager.js`)

El `UIManager` es el orquestador global de la interfaz accesible mediante `window.uiManager`. Maneja notificaciones en tiempo real, estados de red, modales de paywall y visores de medios.

### 1.1. Sistema de Notificaciones (Toasts)
Feedback visual rápido, no intrusivo y reactivo con animación y soporte dual-theme.

```javascript
// Notificación de éxito
window.uiManager.showToast('✅ ¡Cambios guardados con éxito!', 'success', 3000);

// Notificación de error
window.uiManager.showToast('❌ Error al procesar la solicitud.', 'error', 4000);

// Notificación de advertencia
window.uiManager.showToast('⚠️ Faltan campos por completar.', 'warning', 3500);

// Notificación informativa
window.uiManager.showToast('ℹ️ Modo fuera de línea activado.', 'info', 3000);
```

### 1.2. Notificación de Vidas en Tiempo Real (`showLifeDecrementToast`)
Notificación instantánea vinculada al consumo de créditos en cuentas Free/Pending:
```javascript
// Disparado centralizadamente por SessionManager al iniciar un simulacro o acción de consumo
window.uiManager.showLifeDecrementToast(remainingLives, maxLimit);
```
* **Estado Normal (3 a 10 vidas):** `⚡ 1 crédito utilizado. Te quedan 9/10 vidas de prueba.` (Toast tipo `life`).
* **Estado Crítico (1 o 2 vidas):** `⚠️ ¡Atención! Te quedan solo 1/10 vidas de prueba.` (Toast tipo `warning`).
* **Estado Agotado (0 vidas):** `🔒 Has agotado tus vidas de prueba semanal.` y apertura automática del `PaywallModal`.

### 1.3. Modales de Suscripción y Autenticación
* **Paywall / Límite de Cuota:** `window.uiManager.showPaywallModal(customMessage, featureName)`
* **Invitación de Registro a Visitantes:** `window.uiManager.showAuthPromptModal()`

---

## 2. 🪟 ConfirmationModal (`confirmationModal.js`)

Reemplazo premium, accesible y asíncrono para `window.confirm()` y `window.alert()`, con soporte completo de promesas `async/await`.

### 2.1. Confirmación de Acción (Diálogo Interactivo)
```javascript
const confirmed = await window.confirmationModal.show(
    '¿Estás seguro de eliminar este mazo de tarjetas?', 
    'Eliminar Mazo', 
    'Sí, eliminar', 
    'Cancelar'
);

if (confirmed) {
    // Proceder con la eliminación
}
```

### 2.2. Alerta / Aviso Obligatorio
```javascript
await window.confirmationModal.showAlert(
    'Has completado todas las preguntas de este tema. Intenta cambiar de área o dificultad.', 
    '¡Banco Agotado!',
    'Entendido'
);
```

---

## 3. 💬 TooltipManager & Onboarding Tour (`tooltipManager.js`)

Gestor unificado de tooltips declarativos y asistente guiado de 3 pasos para la plataforma.

### 3.1. Tooltips Declarativos (HTML)
Añadir atributos en cualquier etiqueta HTML:
```html
<button class="btn-primary" data-tooltip="Generar preguntas oficiales con IA" data-tooltip-pos="top">
    Iniciar
</button>
```

### 3.2. Onboarding Tour Guiado
```javascript
// Iniciar el tour en modo forzado (ej. botón 'Guía')
window.TooltipManager.startSimulatorTour(true);

// Cerrar cualquier tooltip o tour activo
window.TooltipManager.hide();
```

---

## 4. 🪟 Estándar Global de Modales y Control de Scroll

Para evitar el molesto *Scroll Chaining* (desplazamiento del fondo cuando el modal llega al tope):

1. **Clase Bloqueadora en Body:** Todo modal activo añade `document.body.classList.add('modal-open')`.
2. **Overscroll Contain:**
   ```css
   body.modal-open {
       overflow: hidden !important;
   }
   .modal-body, .results-overlay, .confirmation-modal-overlay {
       overscroll-behavior: contain;
   }
   ```
3. **Pila de Estados (History / ESC):** `window.uiManager.pushModalState(id)` y `window.uiManager.popModalState(id)`.

---

## 5. 🎨 Plantillas de Componentes y Carruseles (`components.js`)

Generación de estructuras DOM limpias y funcionales:
* **Inicializador de Carruseles:** `window.initializeCarousel('contenedor-id')` para scroll horizontal suave con flechas adaptativas.
* **Componentes de Tarjeta Hero & Novedades:** Renderizadores estandarizados para noticias, guías, normas y papers.

---

## 6. 🏗️ Jerarquía Visual y Z-Index

Para prevenir colisiones visuales ("z-index wars"):

| Capa | Rango Z-Index | Componentes |
| :--- | :--- | :--- |
| **Feedback Crítico (Toasts)** | `2147483647` | `window.uiManager.showToast`, Toasts de Vidas |
| **Lightbox / Visor de Medios** | `11000` | `.lightbox-modal` |
| **Onboarding Tour & Tooltips** | `9000` - `10000` | `.hub-guided-tip`, `.hub-tooltip` |
| **Modales de Sistema** | `2000000` | `confirmationModal`, `paywallModal`, `authPromptModal` |
| **Overlays de Examen / Resultados** | `100` - `9999` | `#resultsOverlay`, `#loading-overlay` |
| **Cabecera Persistente & Sidebar** | `1000` | `.main-header`, `.global-sidebar` |
| **Contenido Principal** | `1` - `100` | Tarjetas, grids y layouts de página |

---

## 7. 📚 Mejores Prácticas para Desarrolladores

1. **Eradicación Total de Popups Nativos:** Prohibido el uso de `window.alert()` o `window.confirm()`.
2. **Aislamiento de Eventos en Botones de UI:** Utilizar `e.stopPropagation()` al manipular elementos superpuestos.
3. **Sin Clases Huérfanas:** Asegurarse de que los selectores CSS de botones (`.btn-results-review`, `.btn-secondary`, `.btn-review-tutor-trigger`) pertenezcan al diseño Manta y respeten la paleta dual (Salud = Teal / Educación = Royal Blue).
