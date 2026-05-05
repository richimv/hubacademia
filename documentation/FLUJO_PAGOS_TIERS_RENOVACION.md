# Flujo de Transición y Arquitectura Segura de Pagos: De "Visitante" a "Advanced"

Para entender cómo funciona el pulmón económico de Hub Academia, debemos mapear 5 momentos cruciales en el viaje del estudiante, la base de datos distribuida y el Servidor (API en Node.js + Mercado Pago).

---

## FASE 1: El Visitante y el Registro Inicial
Cuando un médico entra al portal y presiona **Registrarse**, es llevado al `authController.js`.
- Al insertar su cuenta a la base de datos `users`, el sistema de postgresql lo inyecta **por defecto** con los siguientes parámetros fundacionales:
  - `role`: `'student'`
  - `subscription_tier`: `'free'`
  - `subscription_status`: `'pending'` (Significa que la cuenta está creada pero aún no ha realizado su primer pago para activar el dashboard premium o validar su acceso).
  - `subscription_expires_at`: `NULL` (Los usuarios *Free* no tienen fecha límite, siempre vivirán en la capa base y el middleware jamás intentará rebajarlos a nada inferior).

## FASE 2: El Modelo de Vidas (Freemium de Entrada)
El usuario recién horneado entra al **Simulador Médico**. Este módulo no tiene barreras directas sobre cuántos clics da, sino sobre **Acciones Core** de generación y calificación.
- El Archivo Involucrado es: `TrainingService.js` (Backend) conectado a un sistema llamado **UsageService** (Vidas).
- Los estudiantes cuyo tier es `'free'` al querer darle "Empezar Examen", disparan en BD la tabla `usage_logs`. 
- Si no tiene más de 3 registros consumidos globales en toda su historia, se le concede generar un Examen Básico. 
- Al consumirse la de la *Vidas*, la UI arroja el **Modal Paywall: "Alcanzaste tu límite de simulaciones gratuitas"** para convertirlos a pago.

## FASE 3: Transacción o Conversión a Usuario Pro
El usuario clickea comprar un paquete "Advanced" (Tutor IA - 6 Meses).
- Entra el archivo: `paymentController.js` (Método `createOrder`).
- Le preparamos a Mercado Pago un JSON transaccional donde le decimos: 
    - `user.email`
    - Qué nos está comprando
    - Pero lo fundamental es la varibale OCULTA a los ojos del Front: `external_reference: "USER_ID_UUID|advanced"`. Esta pieza guarda "quien" y "qué" pagó para que cuando MercadoPago responda sepamos la ruta a seguir.
- El usuario llena su número de tarjeta y clickea "Pagar".

## FASE 4: Confirmación Asíncrona Webhook (Notificación Back-to-Back)
El navegador del usuario no aprueba la transacción jamás. Es **Mercado Pago quien le habla a nuestro servidor por detrás** usando una URL encriptada.
- Archivo: `paymentController.js` (Método `handleWebhook`).
- Cuando Mercado Pago reporta `status: 'approved'`, entra a un bloque If.
- **¿Cómo discierne el sistema entre Basic o Advanced?** El servidor separa la variable secreta (`external_reference`) por esa pleca vertical de texto (`|`). Obteniendo que UUID `A123` nos pagó legalmente el código en constante de sistema, es decir `advanced` o `basic`.
- El Servidor compara si el Monto reportado por MP es casi idéntico o mayor al de nuestro servidor (ej: 24.9), protegiéndonos de cobros alterados a S/ 0.10 céntimos.

### 💰 La Cirugía a Nivel de Base De Datos (Activación de Tier)
En ese mismo milisegundo de aprobación, se dispara un `UPDATE users` titánico en PostgreSQL que:
1. Pone `subscription_tier`: `'advanced'` o `'basic'` dependiendo del ID de Mercado Pago.
2. Pone `subscription_status`: `'active'`.
3. Pone todas las cuotas a cero `daily_ai_usage = 0`, `monthly_flashcards_usage = 0` (Le resetea los consumos diarios/mensuales que tuvo gratis en el pasado si los tuvo erróneamente para reiniciar en limpio).
4. Cómputo Automático de Caducidad usando un reloj Universal (UTC): Inyecta a la Columna de Expiración el comando nativo `NOW() + INTERVAL '6 months'` (Advanced) o `INTERVAL '2 months'` (Basic). Así el servidor Base de Datos calcula hasta el segundo y día exacto su vencimiento a futuro, descartando fallos por años bisiestos.

## FASE 4.5: El Retorno Triunfal a la Aplicación (Frontend Callback)
Una vez pagado el plan en la pasarela, Mercado Pago redirige automáticamente al usuario a nuestra web a través de la URL de éxito parametrizada `/?payment=success` (configurada en `paymentController.js`).
- El archivo `app.js` posee un interceptor silencioso global en el `DOMContentLoaded` que captura esta bandera.
- Al detectarla: 
  1. Limpia higiénicamente la URL del usuario eliminando el query param.
  2. Dispara el reinicio del JWT de la máquina local (`sessionManager.validateSession()`) forzando al navegador a darse cuenta inmediatamente que ya no es un Trial, sino un VIP.
  3. Ejecuta una alerta mágica de Gratitud (SweetAlert) confirmándole al alumno que sus límites han sido destrabados con éxito, entregándole control absoluto al instante sin tener que volver a Iniciar Sesión.

## FASE 5: Vida Diaria y Control de Expiración
A partir de este momento, cada acción es auditada por `checkLimitsMiddleware.js`.
- **Detección de Expiración**: Si `Date.now() > subscription_expires_at`:
    1. Se rebaja el usuario a `subscription_tier: 'free'`.
    2. Se cambia el status a `subscription_status: 'expired'`.
    3. **Reseteo de Vidas (usage_count = 0)**: Como beneficio por haber sido cliente, al regresar a la capa gratuita se le otorgan **50 nuevas vidas** para garantizar que pueda seguir usando la plataforma de forma limitada.

---

## FASE 6: Modelo de "Pase de Acceso" y Jerarquía de Tiers
A diferencia de otros SaaS, Hub Academia utiliza un modelo de **Acceso por Tiempo Fijo** (Pago Único), evitando cobros recurrentes inesperados.

### 1. Jerarquía de Poder
- **FREE < BASIC < ADVANCED**
- Un plan de nivel superior **incluye y supera** todos los beneficios del nivel inferior.

### 2. Reglas de Compra y Renovación (Pricing UI)
- **Bloqueo Descendente**: Un usuario con **Advanced Activo** tiene bloqueada la compra de **Basic**. La UI debe mostrarlo como "Incluido" o "Bloqueado por Plan Superior".
- **Renovación del Mismo Tier**: Para evitar duplicidad de pagos, el usuario debe esperar a que su plan actual expire para comprar exactamente el mismo tier nuevamente.
- **Mejora de Tier (Upgrade - El Regalo)**: 
    - Un usuario con **Basic Activo** puede comprar **Advanced** en cualquier momento.
    - **Lógica de Tiempo**: El sistema sumará el tiempo restante del plan Basic al nuevo plan Advanced. 
    - **Resultado**: El usuario se convierte en Advanced inmediatamente y "gana" meses extra de Advanced por el tiempo que ya había pagado en Basic.

### 3. Comunicación al Usuario
- La UI no debe usar el término "Suscripción Mensual".
- Debe usar: **"Acceso por 2 meses"** o **"Acceso por 6 meses"** (Pago Único). Esto elimina la ansiedad por cobros automáticos.

---
