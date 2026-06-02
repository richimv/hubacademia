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

### 3.2. Limitación de Tasa (Rate Limiting y Prevención de Abuso)
*   **Global API Limiter:** Aplicado universalmente en el entrypoint de todas las rutas `/api/*` en [server.js](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/infrastructure/config/server.js) mediante `express-rate-limit`. Establece un techo de **500 peticiones por IP cada 15 minutos**, protegiendo al servidor de escaneos automáticos de vulnerabilidades y ráfagas maliciosas de clics.
*   **Auth Limiter (Estricto):** Protege las rutas críticas de autenticación y sincronización de sesiones en [apiRoutes.js](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/infrastructure/routes/apiRoutes.js) (`/api/auth/sync`). Restringe la tasa a un máximo de **20 intentos por IP cada 15 minutos**, erradicando ataques de fuerza bruta en el handshake de tokens.
*   **Límites de Capa de Negocio (Cerbero):** El middleware centralizado [checkLimitsMiddleware.js](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/application/middlewares/checkLimitsMiddleware.js) audita el consumo de APIs de Vertex AI (Chat, Audio, Flashcards, Simuladores) y el volumen de archivos cargados según el rol y tier activo de la cuenta, arrojando respuestas `403 Forbidden` instantáneas cuando se sobrepasa la cuota.

### 3.3. Sanitización y Blindaje Anti-SQLi y Anti-Prompt Injection
*   **Utilidad Centralizada (`securityUtils.js`):** Todo texto proporcionado por el usuario es sanitizado antes de interactuar con la base de datos o alimentar los modelos de IA mediante la función `sanitizeInputForAI`.
*   **Prevención de Prompt Injection / Jailbreaks:** Se neutralizan directivas sospechosas comunes (por ejemplo, `ignore previous instructions`, `forget rules`, etc.) previniendo ataques de alteración de comportamiento en el LLM.
*   **Control de Desbordamiento de Tokens (DoS):** Se aplican restricciones estrictas de longitud sobre campos de entrada (límite de palabras de 80, temas de 150, textos cortos de 500 y textos largos de 2000 caracteres) para prevenir ataques de denegación de servicio por inyección masiva de tokens.
*   **Validación de Estadísticas de Diagnóstico:** Se realiza casteo numérico estricto y saneamiento de claves de radar antes de procesar prompts de analítica.
*   **Validación de Exportaciones CSV en Servidor:** Se verifica mediante listas blancas en `adminRepository.js` que el nombre de la tabla y las columnas solicitadas en exportaciones de bases de datos correspondan a esquemas permitidos para evitar inyección SQL por manipulación de parámetros de exportación.

### 3.4. Blindaje Criptográfico de Webhooks de Pago
*   **Validación de Firmas HMAC-SHA256:** Se ha integrado la comprobación de firmas criptográficas nativas usando la librería `crypto` de NodeJS en `paymentController.js`.
*   **Seguridad contra Suplantación:** Se lee la cabecera `x-signature` y se calcula el hash HMAC a partir del cuerpo del webhook utilizando el token secreto privado del proveedor. Si la firma es incorrecta, la petición se bloquea con código `401 Unauthorized` inmediatamente, evitando la simulación de transacciones aprobadas.

---

## 4. 🗄️ Seguridad de la Base de Datos (PostgreSQL & Supabase)

### 4.1. Prevención Total de Inyección SQL
*   **Consultas Parametrizadas:** Es la regla de oro en todos los repositorios (`userRepository`, `medicoRepository`, `docenteRepository`, etc.). Nunca se concatenan variables en strings SQL.
*   **Driver Seguro:** Uso del driver `pg` con prepared statements automáticos.

### 4.2. Seguridad a Nivel de Fila (RLS) al 100%
*   **Políticas de Aislamiento:** Row Level Security (RLS) se encuentra **habilitado en el 100% de las tablas** en el esquema `public` (31 tablas protegidas).
*   **Catálogos Públicos (Lectura):** Las tablas de datos estáticos y relación (`careers`, `courses`, `topics`, `resources`, `course_books`, `course_careers`, `course_topics`, `topic_resources`, `question_bank`) permiten lectura pública (`SELECT USING (true)`) pero deniegan cualquier escritura desde la API pública PostgREST.
*   **Datos Privados (Propietario):** Las tablas con datos personales y de actividad (`users`, `conversations`, `chat_messages`, `user_book_library`, `user_course_library`, `user_question_history`, `feedback`, `search_history`, `page_views`, `web_traffic`) aíslan el acceso permitiendo operaciones únicamente cuando `auth.uid()` coincide con el ID del propietario.
*   **Bypass Seguro en Backend:** El backend de Node.js se conecta directamente a PostgreSQL con el rol administrativo `postgres`. Dado que esta conexión directa omite RLS, las operaciones administrativas del servidor y la lógica de negocio continúan funcionando sin necesidad de exponer permisos de escritura en la API pública.

### 4.3. Hardening de Esquema y Funciones de Base de Datos
*   **Definición Segura de search_path:** Todas las funciones `SECURITY DEFINER` (como `sp_register_user`, `f_unaccent`, `match_documents` y funciones auxiliares de triggers como `update_updated_at_column`) tienen configurado explícitamente `SET search_path = public` para evitar ataques de secuestro de ruta (Search Path Hijacking).
*   **Restricción de Ejecución en RPC:** Se revoca el permiso de ejecución (`EXECUTE`) a los roles públicos `PUBLIC`, `anon` y `authenticated` en funciones de registro críticas como `sp_register_user`, impidiendo invocaciones maliciosas desde el cliente web.
*   **Reubicación de Extensiones:** Las extensiones del motor (`unaccent`, `fuzzystrmatch`, `pg_trgm`, `vector`) se reubican a un esquema aislado (`extensions`), reduciendo la visibilidad y superficie de ataque en el esquema `public`.

### 4.4. Integridad y Cooldowns
*   **Restricciones de Cambio de Perfil:** Implementación de `last_name_change_at` para limitar cambios de nombre a una vez por semana, mitigando el spam de perfiles.
*   **Limpieza en Cascada:** Uso de `ON DELETE CASCADE` para asegurar que el borrado de una cuenta elimine absolutamente toda la huella digital del usuario (GDPR Compliance).

---

## 5. 🛡️ Infraestructura y Hardening

### 5.1. Gestión de Secretos
*   **Environment Variables:** Las llaves de API (Gemini, MercadoPago, Supabase) nunca se suben al código fuente (Git). Se gestionan como variables de entorno en Render/Vercel.
*   **Secret Files:** Los archivos de credenciales de Google Cloud (`service-account-key.json`) se montan como archivos secretos en el entorno de ejecución, fuera del alcance del código público.

### 5.2. Hardening de Almacenamiento (Supabase Storage)
*   **Denegación de Listado de Archivos:** Se elimina la política amplia de tipo `SELECT` sobre `storage.objects` para el bucket de almacenamiento público (`portadas`). Esto deshabilita la capacidad de clientes maliciosos de listar los archivos del directorio, mientras se conserva la descarga directa de archivos a través de las URLs públicas de Supabase.

### 5.3. Resiliencia y Alta Disponibilidad
*   **Retry Pattern:** El sistema implementa reintentos automáticos con *Exponential Backoff* para manejar errores de red temporales entre el backend y Supabase.
*   **Offline Resilience:** Persistencia inmediata en `localStorage` para evitar pérdida de datos durante exámenes ante microcortes de internet.

---

## 6. 📝 Auditoría y Cumplimiento
*   **Logs Limpios:** En producción, se deshabilitan los logs de consola para evitar la exposición de la estructura interna del sistema a través del inspector del navegador.
*   **Hashes Criptográficos:** Uso de MD5/SHA para validar la integridad de las preguntas del banco y evitar duplicados o colisiones de datos.

---

**Estado:** Documentación Oficial v2.0 (Junio 2026 - Conforme a Auditoría de Seguridad y Hardening RLS)
