# 🛡️ Estándares de Ciberseguridad: Hub Academia

Este documento centraliza todas las medidas de seguridad implementadas en la plataforma para proteger la integridad del sistema, la privacidad de los usuarios y la estabilidad de los datos.

---

## 1. 🏗️ Filosofía de Seguridad ("Security by Design")
Hub Academia sigue un enfoque de defensa en profundidad, donde cada capa del sistema (Frontend, API, Backend, Base de Datos) actúa como un filtro independiente para mitigar riesgos.

---

## 2. 🔑 Autenticación e Identidad (Identity-First)

### 2.1. Proveedor Único (Google-Only v2.0)
*   **Delegación de Confianza:** Se utiliza Google como único proveedor de identidad (IdP). Esto elimina la necesidad de almacenar contraseñas en nuestra base de datos, mitigando el riesgo de ataques de fuerza bruta o filtraciones de credenciales.
*   **Supabase Auth:** Actúa como el gestor de sesiones basado en **JSON Web Tokens (JWT)**.
*   **Mecanismos de Login:**
    *   **Google One Tap:** Inicio de sesión instantáneo y pasivo.
    *   **OAuth 2.0 Redirect:** Flujo estándar para navegadores con restricciones.

### 2.2. Control de Acceso Basado en Roles (RBAC)
*   **Roles:** `student` y `admin`.
*   **Validación Server-Side:** Los privilegios de administrador se validan en el backend mediante una lista blanca segura (`adminEmails`) y verificaciones directas en la base de datos, impidiendo la escalada de privilegios desde el cliente.

### 2.3. Protección de Recuperación de Cuenta
*   **Intercepción de Tokens:** Se ha implementado un interceptor en el frontend (`app.js`) que captura tokens de recuperación de Supabase para forzar el flujo de cambio de contraseña en una vista segura (`update-password.html`), evitando el autologin no deseado.

---

## 3. 🛡️ Seguridad de la API y Endpoints

### 3.1. Middleware de Autenticación
*   **Validación de Token:** Cada petición a rutas protegidas (`/api/*`) debe incluir un encabezado `Authorization: Bearer <JWT>`. El middleware verifica la firma y vigencia del token antes de permitir el acceso al controlador.
*   **Gestión Centralizada (NetworkService):** Se ha eliminado la gestión manual de tokens en cada archivo `.js`. Ahora el `NetworkService` centraliza la inyección de seguridad, reduciendo la superficie de ataque y evitando fugas de tokens por errores de implementación en nuevos módulos.
*   **Bypass Controlado:** Algunas rutas de lectura son `optionalAuth`, permitiendo acceso limitado a invitados mientras se personaliza la experiencia para usuarios logueados.

### 3.2. Limitación de Tasa (Rate Limiting)
*   **Auth Limiter:** Protege los endpoints de sincronización contra abusos.
*   **Límites de Cuotas (Cerbero):** El middleware `checkLimitsMiddleware.js` controla el consumo de IA y Simulacros según el plan del usuario (Free/Premium), protegiendo la rentabilidad y previniendo el scraping masivo.

### 3.3. Sanitización y Validación de Entrada
*   **Input Check:** Validación estricta de tipos y longitudes (ej: el nombre debe tener >2 caracteres).
*   **Prevención de XSS:** Limpieza de datos en el frontend antes de renderizar y uso de métodos seguros para manipular el DOM.

---

## 4. 🗄️ Seguridad de la Base de Datos (PostgreSQL)

### 4.1. Prevención Total de Inyección SQL
*   **Consultas Parametrizadas:** Es la regla de oro en todos los repositorios (`userRepository`, `trainingRepository`, etc.). Nunca se concatenan variables en strings SQL.
*   **Driver Seguro:** Uso del driver `pg` con prepared statements automáticos.

### 4.2. Seguridad a Nivel de Fila (RLS)
*   **Políticas de Supabase:** Tablas críticas como `quiz_scores`, `user_flashcards` y `decks` tienen habilitado **Row Level Security**.
*   **Aislamiento de Datos:** Los usuarios solo pueden leer o escribir en filas donde `auth.uid() = user_id`, garantizando que la información privada sea inaccesible incluso si un atacante conoce el ID de otro usuario.

### 4.3. Integridad y Cooldowns
*   **Restricciones de Cambio de Perfil:** Implementación de `last_name_change_at` para limitar cambios de nombre a una vez por semana, mitigando el spam de perfiles.
*   **Limpieza en Cascada:** Uso de `ON DELETE CASCADE` para asegurar que el borrado de una cuenta elimine absolutamente toda la huella digital del usuario (GDPR Compliance).

---

## 5. 🛡️ Infraestructura y Hardening

### 5.1. Gestión de Secretos
*   **Environment Variables:** Las llaves de API (Gemini, MercadoPago, Supabase) nunca se suben al código fuente (Git). Se gestionan como variables de entorno en Render/Vercel.
*   **Secret Files:** Los archivos de credenciales de Google Cloud (`service-account-key.json`) se montan como archivos secretos en el entorno de ejecución, fuera del alcance del código público.

### 5.2. Resiliencia y Alta Disponibilidad
*   **Retry Pattern:** El sistema implementa reintentos automáticos con *Exponential Backoff* para manejar errores de red temporales entre el backend y Supabase.
*   **Offline Resilience:** Persistencia inmediata en `localStorage` para evitar pérdida de datos durante exámenes ante microcortes de internet.

---

## 6. 📝 Auditoría y Cumplimiento
*   **Logs Limpios:** En producción, se deshabilitan los logs de consola para evitar la exposición de la estructura interna del sistema a través del inspector del navegador.
*   **Hashes Criptográficos:** Uso de MD5/SHA para validar la integridad de las preguntas del banco y evitar duplicados o colisiones de datos.

---

**Estado:** Documentación Oficial v1.0 (Abril 2026)
