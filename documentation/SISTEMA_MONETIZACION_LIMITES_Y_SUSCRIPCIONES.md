# 📊 SISTEMA DE MONETIZACIÓN, LÍMITES Y SUSCRIPCIONES (Documento Consolidado)

Este documento centraliza toda la arquitectura de monetización, el modelo de suscripciones, las cuotas de control de consumo de IA y las interfaces visuales (UI/UX) integradas en HubAcademia. Sirve como la única fuente de verdad técnica para los desarrollos en estas áreas.

---

## 🏗️ 1. Estructura Matemática de Suscripciones (Planes y Tokens)

El sistema opera con límites de consumo rígidos según el nivel de suscripción del alumno para proteger la rentabilidad frente a costos de infer| Característica | **Plan Básico (Basic)** | **Plan Avanzado (Advanced)** | **Prueba Gratuita (Free)** |
| :--- | :--- | :--- | :--- |
| **Costo / Duración** | S/ 9.90 (2 Meses) | S/ 24.90 (4 Meses) | Gratuito |
| **Tutor IA (Chat)** | Estándar (50 msg/día, Sin RAG) | Inteligente con RAG / Razonamiento (100 msg/día) | Estándar (Sin RAG, Descuenta vidas) |
| **Consultas RAG** | No Incluido (0 msg/día) | Incluido (Hasta 25 msg RAG/Día, degradable a estándar) | No Incluido (Bloqueado) |
| **Voz (Audio Assistant)**| Estándar (50 msg/día) | Avanzado (100 msg/día) | Descuenta vidas |
| **Flashcards (IA)** | No Incluido (Manuales únicamente) | 30 intentos / mes (Con IA) | No Incluido (Manuales únicamente) |
| **Simulador de Exámenes** | **CAP 15/Día** | **CAP 50/Día** | Descuenta vidas (20 de prueba) |

---

## 🔄 2. Ciclo de Vida del Estudiante (Conversión y Acceso)

El viaje de un usuario dentro de la plataforma se gestiona de forma secuencial:

### Fase 2.1: Registro e Inicialización (Visitante)
*   Cuando un nuevo usuario se registra a través de `authController.js`, PostgreSQL le asigna por defecto:
    *   `role`: `'student'`
    *   `subscription_tier`: `'free'`
    *   `subscription_status`: `'pending'`
    *   `subscription_expires_at`: `NULL`
*   Para evitar fricciones iniciales, `AuthService.js` aprovisiona automáticamente preferencias base en el simulador: target `SERUMS`, carrera `Medicina Humana`, dificultad `Básico` y 5 áreas del temario oficial MINSA.

### Fase 2.2: El Modelo de Vidas (Freemium de Entrada)
*   El usuario gratuito opera con un pool de **vidas** o créditos de prueba (columna `usage_count` inicializada en `20`).
*   Cada acción core (empezar examen, evaluar speaking, mensaje de chat) descuenta créditos (las consultas de chat descuentan exactamente 1 vida y se ejecutan sin RAG). Cuando se agotan, la UI despliega de forma segura el modal paywall bloqueante impidiendo el abuso del servicio.

### Fase 2.3: Compra y Webhook de Mercado Pago
*   El usuario adquiere un plan premium redireccionándose a Mercado Pago (`paymentController.js`). El servidor inyecta una variable oculta en la pasarela: `external_reference: "USER_ID_UUID|advanced"`.
*   La confirmación se gestiona de forma asíncrona mediante el Webhook de Mercado Pago (`handleWebhook`).
*   Al validarse un pago aprobado (`approved`) y verificar la seguridad de la tarifa, el servidor ejecuta la actualización en PostgreSQL:
    *   Establece `subscription_tier` a `'advanced'` o `'basic'`.
    *   Fija `subscription_status` a `'active'`.
    *   Resetea todos los consumos a cero (`0`).
    *   Actualiza la fecha de caducidad en formato UTC: `subscription_expires_at = NOW() + INTERVAL '4 months'` (ó 2 meses).

### Fase 2.3.1: Pago Manual vía Yape/Plin (Alternativa WhatsApp)
*   **Interfaz pricing.html**: Ofrece un banner destacado que abre un modal con el código QR de Yape real cargado de forma local (`/assets/yape-qr.jpeg`), asociado a la cuenta de **Ricardo M.** y al número celular oficial **+51 980844817** (HubAcademia).
*   **Pestañas de Planes**: Permite seleccionar dinámicamente el plan básico (S/ 9.90 por 2 meses) o el plan avanzado (S/ 24.90 por 4 meses) y actualiza automáticamente los montos e instrucciones en tiempo real.
*   **Redirección Dinámica**: Mediante `pricing.js` y el `SessionManager`, se captura el email registrado del usuario para pre-llenar un mensaje de WhatsApp personalizado al hacer clic en "Enviar Comprobante por WhatsApp".
*   **Activación y Consistencia Interactiva en el Panel de Gestión (`admin.js`)**: El administrador puede editar el registro de cualquier estudiante desde el Panel de Gestión. El sistema automatiza y restringe los valores en el cliente en tiempo real:
*   Si selecciona `basic`, el estado cambia a `active` y se calcula la fecha actual + 2 meses.
*   Si selecciona `advanced`, el estado cambia a `active` y se calcula la fecha actual + 4 meses.
*   Si selecciona `free`, el estado cambia a `pending`/`expired` y se limpia la fecha.
*   Si el estado se cambia manualmente a `pending` o `expired`, el tier se degrada automáticamente a `free` y la fecha de expiración se borra.
*   **Reglas de Validación y Fidelización en Backend (`adminService.js`)**: El backend actúa como una red de seguridad atómica para garantizar que no existan combinaciones inconsistentes en base de datos. Cuando se activa el estado a `'active'` de manera manual en el panel, el backend automáticamente:
    *   Fuerza los tiers y estados a ser consistentes (no permite planes premium en estado `pending`).
    *   Autocalcula la expiración del plan si no fue provista (+2 meses para basic, +4 meses para advanced).
    *   Resetea todos los contadores de consumo diario y mensual a cero (`usageCount = 0`, `dailyAiUsage = 0`, etc.) simulando exactamente el webhook de Mercado Pago para inicializar el pool limpio.

### Fase 2.4: Retorno al Cliente y Sincronización
*   El usuario es redirigido de regreso a la aplicación a la URL `/?payment=success`.
*   El frontend intercepta este parámetro, refresca el token JWT del usuario (`sessionManager.refreshUser()`) y dispara una confirmación visual (SweetAlert) actualizando los límites de inmediato sin requerir re-autenticación.

### Fase 2.5: Control de Expiración
*   Si la fecha actual supera el valor de `subscription_expires_at`, el middleware reduce de inmediato el nivel a `subscription_tier: 'free'` y actualiza el status a `'expired'`.
*   Como beneficio por haber sido cliente, se le otorgan **20 nuevas vidas** de prueba y se resetea la fecha de renovación gratuita.

---

## 🛠️ 3. Módulos y APIs del Backend

### 3.1 Módulo: El Simulador (Training Service)
*   **Usuarios Premium:** Las cuotas diarias de exámenes se descuentan únicamente al **culminar y enviar** el examen (`submitScore`).
*   **Usuarios Free:** Consumen vidas de prueba al **iniciar** la Ronda 1.
*   **Reposición por IA ("Banco Infinito")**: Si el stock local del banco es menor a 5 preguntas, se activa la generación de emergencia balanceada por áreas para completar el lote sin interrumpir el flujo.

### 3.2 Módulo: Tutor IA (Chat y Idiomas)
*   Las consultas al chat del tutor médico y del chat conversacional de idiomas comparten el contador global `daily_ai_usage` regulado por el middleware `checkAILimits('chat_standard')`.
*   **RAG Exclusivo:** Solo los usuarios del plan Advanced activan la biblioteca RAG ( Harrison, NTS o GPC) en el chat.

### 3.3 Módulo: Diagnóstico Clínico (Analytics)
*   Permite a los usuarios Advanced realizar una correlación estadística de sus fallas mediante `POST /api/analytics/diagnostic`. Consume de la cuota diaria del chat.

### 3.4 Módulo: Generador de Flashcards (Tarjetas de Repaso)
*   Se almacena en `monthly_flashcards_usage`. Limita de forma estricta los intentos de creación a 10 mensuales (Básico) y 30 mensuales (Avanzado).

---

## 🗄️ 4. Estructura de Base de Datos y Metadata

| Campo DB (`users`) | Tipo de Datos | Propósito Técnico |
| :--- | :--- | :--- |
| `subscription_tier` | `VARCHAR` | Nivel de plan activo (`'free'`, `'basic'`, `'advanced'`, `'elite'`). |
| `subscription_status` | `VARCHAR` | Estado de la suscripción (`'pending'`, `'active'`, `'expired'`). |
| `subscription_expires_at`| `TIMESTAMP` | Fecha de expiración en tiempo UTC. |
| `daily_ai_usage` | `INTEGER` | Mensajes diarios estándar sin RAG (normal, flashcard_tutor). |
| `daily_rag_usage` | `INTEGER` | Consultas RAG especializadas (salud, educación, quiz_tutor). Límite de 25/día para Advanced, fallback a daily_ai_usage si se agota. |
| `daily_simulator_usage` | `INTEGER` | Simulacros finalizados en el día actual. |
| `monthly_flashcards_usage`| `INTEGER` | Intentos mensuales de generación de flashcards. |
| `last_usage_reset` | `TIMESTAMP` | Última fecha en que se reiniciaron los contadores diarios. |

---

## 🏗️ 5. Unificación Arquitectónica de Límites (limits.js)

Para evitar duplicar constantes en el frontend y backend:
1.  **limits.js (Fuente Única de Verdad):** Centraliza las cuotas en [limits.js](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/infrastructure/config/limits.js).
2.  **Inyección en Perfil (`getMe`):** El endpoint `/api/auth/me` inyecta dinámicamente la configuración `limits` del plan.
3.  **Cliente Sync:** El validador en el cliente `validateFreemiumAction()` de [uiManager.js](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/js/ui/uiManager.js) resuelve el límite dinámicamente, garantizando un mantenimiento centralizado.

---

## 🖥️ 6. UI/UX del Sistema de Suscripciones y Precios

### 6.1 Página de Perfil (`profile.html`)
*   **Badge Dinámico**: Muestra de forma colorida el plan del usuario (*Plan Gratuito*, *Plan Basic* o *Plan Advanced*).
*   **Cuadrícula de Consumos `#premium-usage-card`**: Dibuja barras de progreso del consumo actual frente al límite diario y mensual inyectado por el backend.

### 6.2 Página de Pricing e Upgrades (`pricing.html`)
*   **Diseño Glassmorphic Cyber-Minimalist**: Tarjetas translúcidas oscuras con desenfoque de fondo (`backdrop-filter`) y alineación editorial a la izquierda.
*   **Flujo de Upgrades Activos**: Los usuarios con Plan Básico pueden visualizar y adquirir el Plan Avanzado. La tarjeta de su plan actual cambia visualmente con borde dorado y botón deshabilitado ("Plan Activo").
*   **Reglas de Renovación**: No es posible degradar planes de forma activa. Los usuarios con Advanced ven inhabilitados los botones de Basic ("Incluido en Premium").

### 6.3 Logging en Terminal
El sistema utiliza prefijos informativos para auditar los consumos en Express:
*   `🔎 [Banco]`: Consulta de stock local en las áreas.
*   `🤖 [IA Reposición]`: Generación de emergencia balanceada por falta de stock.
*   `🍃 [IA AHORRO]`: Uso de modelo Lite sin costo de razonamiento.
*   `🛡️ [IA RAG]`: Invocación del RAG oficial (reservado para Advanced/Admin).

---
*Última actualización de la documentación consolidada: 9 de julio de 2026 (Eliminación de Autoevaluación IA y Chat de Audio por costos de IA y reestructuración)*
